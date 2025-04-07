const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');
const axios = require("axios")
const path = require('path');
const cors = require("cors")
const redis = require('redis');
const util = require("util")
const client = redis.createClient(6379,"redis");

client.set = util.promisify(client.set);
client.get = util.promisify(client.get);


client.on("error", (err) => {
    console.error(`Redis Error: ${err}`);
});

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors())

let orderPrice = 0;
let numberIt;
let test;
let lastResult;
let lastText;

app.post("/order", (req, res) => {
    const order = req.body
    const searchId = req.body.id
    const orderCost = req.body.orderCost

    db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }

        if (!!row[0]) {
            numberIt = row[0].numberOfItems;
            orderPrice = row[0].bookCost;
            let numberOfItems = row[0].numberOfItems - 1;

            if (orderCost >= orderPrice) {
                const remainingAmount = orderCost - orderPrice;
                db.run(
                    `UPDATE items SET numberOfItems = ? WHERE id = ?`,
                    [numberOfItems, searchId],
                    function (err) {
                        if (err) {
                            console.error('Error updating record:', err.message);
                            return;
                        }
                    }
                );
            }
        }

        db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, updatedRow) => {
            if (err) {
                console.error(err.message);
                return;
            }

            if (updatedRow) {
                if (updatedRow.length != 0) {
                    test = { numberOfItemsBeforeUpdate: numberIt, data: updatedRow }
                    if (numberIt === updatedRow[0].numberOfItems) {
                        lastResult = false
                    } else {
                        lastResult = true
                    }
                    lastText = `Bought book ${updatedRow[0].bookTitle}`
                }

                if (lastResult)
                    res.send({ result: { status: "success", message: lastText } });
                else
                    res.send({ result: { status: "fail", message: "Failed to buy The book!!" } })
            }
        })
    });
});
app.put('/update/:id', (req, res) => {
    const itemId = req.params.id;
    const { numberOfItems } = req.body;

    db.run(
        `UPDATE items SET numberOfItems = ? WHERE id = ?`,
        [numberOfItems, itemId],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ status: 'error', message: 'Database update failed' });
            }

            res.status(200).json({ status: 'success', message: 'Item quantity updated' });
        }
    );
});


db.serialize(() => {
    db.run(
        `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY ,  
      bookTopic TEXT,
      numberOfItems INTEGER ,
      bookCost INTEGER,  
      bookTitle TEXT
    )`
    );
});

app.get('/search/:bookTopic', async (req, res) => {
    let bookTopic = req.params.bookTopic.trim();
    const cachedPost = await client.get(`${bookTopic}`)

    if (cachedPost) {
        return res.json(JSON.parse(cachedPost))
    }

    db.serialize(() => {
        db.all(`SELECT * FROM items WHERE bookTopic="${bookTopic}"`, (err, row) => {
            if (err) {
                console.log(err);
                return;
            }

            client.set(`${bookTopic}`, JSON.stringify(row))
            res.send({ items: row });
        });
    });
});

app.get('/info/:id', async (req, res) => {
    let id = req.params.id;
    const cachedPost = await client.get(`${id}`)

    db.serialize(() => {
        db.all(`SELECT id,numberOfItems,bookCost FROM items WHERE id=${id}`, async (err, row) => {
            if (err) {
                console.log(err);
                return;
            }

            if (cachedPost) {
                let temp = JSON.parse(cachedPost)
                if (row[0].numberOfItems == temp.numberOfItems)
                    return res.json(JSON.parse(cachedPost))
                else {
                    client.del(`${id}`)
                    return res.json({ Message: "Invalidate" })
                }
            }

            client.set(`${id}`, JSON.stringify(row[0]))
            res.json({ item: row });
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
