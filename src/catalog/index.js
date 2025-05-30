const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const redis = require('redis');
const path = require("path");
const dbpath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbpath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database at src/catalog/database.db');
    }
});
const cors = require("cors")


const client = redis.createClient({
    url: 'redis://redis:6379'
});


(async () => {
    let retries = 5;
    while (retries) {
        try {
            await client.connect();
            console.log('Connected to Redis');
            break;
        } catch (err) {
            console.error(`Redis connection error: ${err.message}`);
            retries -= 1;
            console.log(`Retries left: ${retries}`);

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
})();

client.on("error", (err) => {
    console.error(`Redis Error: ${err}`);
});

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors())


app.post("/order", (req, res) => {
    const searchId = req.body.id;
    const orderCost = req.body.orderCost;
    db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, row) => {
        console.log(row);
        if (err) {
            console.error(err.message);
            res.send({ result: { status: "fail", message: "Database error!" } });
            return;
        }

        if (row.length === 0) {
            res.send({ result: { status: "fail", message: "Book not found!" } });
            return;
        }

        let numberOfItems = row[0].numberOfItems;
        let orderPrice = row[0].bookCost;

        console.log("Order Price:", orderPrice);
        console.log("Order Cost:", orderCost);

        if (orderCost >= orderPrice) {
            console.log(orderCost);
            let newNumberOfItems = numberOfItems - 1;

            db.run(`UPDATE items SET numberOfItems = ? WHERE id = ?`, [newNumberOfItems, searchId], function (err) {
                console.log("db updated");
                if (err) {
                    console.error("Error updating record:", err.message);
                    res.send({ result: { status: "fail", message: "Database update failed!" } });
                    return;
                }

                db.all(`SELECT * FROM items WHERE id = ?`, [searchId], async (err, updatedRow) => {
                    if (err) {
                        console.error(err.message);
                        res.send({result: {status: "fail", message: "Database error after update!"}});
                        return;
                    }

                    if (updatedRow.length === 0) {
                        res.send({result: {status: "fail", message: "Failed to retrieve updated data!"}});
                        return;
                    }

                    let lastText = `Bought book ${updatedRow[0].bookTitle}`;
                    await client.del(`${searchId}`);
                    await client.del(`${updatedRow[0].bookTopic}`);

                    res.send({result: {status: "success", message: lastText}});
                });
            });
        } else {
            res.send({ result: { status: "fail", message: "Insufficient funds to buy the book!" } });
        }
    });
});


app.get('/search/:bookTopic', async (req, res) => {
    let bookTopic = req.params.bookTopic.trim();
    console.log(`Searching for topic: ${bookTopic}`);

    try {
        const cachedPost = await client.get(`${bookTopic}`);
        console.log('Cache result:', cachedPost ? 'HIT' : 'MISS');

        if (cachedPost) {
            return res.json(JSON.parse(cachedPost));
        }

        db.serialize(() => {

            db.all(`SELECT * FROM items WHERE bookTopic = ?`, [bookTopic], async (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                console.log(`Found ${rows.length} books for topic: ${bookTopic}`);


                for (let i = 0; i < rows.length; i++) {
                    console.log(
                        `Book ${i + 1}:`,
                        `ID: ${rows[i].id},`,
                        `Items: ${rows[i].numberOfItems},`,
                        `Cost: ${rows[i].bookCost},`,
                        `Title: ${rows[i].bookTitle}`
                    );
                }

               //cache
                await client.set(`${bookTopic}`, JSON.stringify({ items: rows }));

                res.json({ items: rows });
            });
        });
    } catch (error) {
        console.error('Redis error:', error);

        db.all(`SELECT * FROM items WHERE bookTopic = ?`, [bookTopic], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            console.log(`Found ${rows.length} books for topic: ${bookTopic} (no cache)`);
            res.json({ items: rows });
        });
    }
});

app.get('/info/:id', async (req, res) => {
    let id = req.params.id;
    console.log(`Getting info for ID: ${id}`);

    try {
        const cachedPost = await client.get(`${id}`);

        db.serialize(() => {

            db.all(`SELECT id, numberOfItems, bookCost, bookTitle FROM items WHERE id = ?`, [id], async (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }


                if (rows.length === 0) {
                    return res.status(404).json({ error: 'Book not found' });
                }

                const currentBook = rows[0];

                // check cache
                if (cachedPost) {
                    try {
                        let cachedBook = JSON.parse(cachedPost);
                        console.log(`Current items: ${currentBook.numberOfItems}, Cached items: ${cachedBook.numberOfItems}`);

                        // If inventory matches cache, return cached data
                        if (currentBook.numberOfItems === cachedBook.numberOfItems) {
                            return res.json({ item: cachedBook });
                        } else {
                            // Inventory changed, invalidate cache
                            await client.del(`${id}`);
                            console.log('Cache invalidated due to inventory change');
                        }
                    } catch (parseError) {
                        console.error('Error parsing cached data:', parseError);
                        await client.del(`${id}`);
                    }
                }

                // cache the current data and return it
                await client.set(`${id}`, JSON.stringify(currentBook));
                console.log('Book info retrieved:', currentBook);
                res.json({ item: currentBook });
            });
        });
    } catch (error) {
        console.error('Redis error:', error);
        // if redis fails still try to get data from database
        db.all(`SELECT id, numberOfItems, bookCost, bookTitle FROM items WHERE id = ?`, [id], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Book not found' });
            }

            res.json({ item: rows[0] });
        });
    }
});

// Health check endpoint for auto-scaling
app.get('/health', (req, res) => {
    // Check Redis connection
    if (client.isOpen) {
        res.status(200).json({
            status: 'healthy',
            service: 'catalog-server',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            redis: 'connected'
        });
    } else {
        res.status(503).json({
            status: 'unhealthy',
            service: 'catalog-server',
            timestamp: new Date().toISOString(),
            redis: 'disconnected'
        });
    }
});

// Metrics endpoint for monitoring and scaling decisions
app.get('/metrics', (req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
        service: 'catalog-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
        },
        cpu: process.cpuUsage(),
        redis: client.isOpen ? 'connected' : 'disconnected'
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
