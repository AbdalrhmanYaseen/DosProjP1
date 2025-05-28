const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});
const axios = require("axios")
const path = require('path');
const cors = require("cors")
const util = require("util")



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
    const order = req.body;
    const searchId = req.body.id;
    const orderCost = req.body.orderCost;
    console.log("Reached the catalog");
    console.log(searchId);
    db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, row) => {

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
            let newNumberOfItems = numberOfItems - 1;

            db.run(`UPDATE items SET numberOfItems = ? WHERE id = ?`, [newNumberOfItems, searchId], function (err) {
                if (err) {
                    console.error("Error updating record:", err.message);
                    res.send({ result: { status: "fail", message: "Database update failed!" } });
                    return;
                }

                db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, updatedRow) => {
                    if (err) {
                        console.error(err.message);
                        res.send({ result: { status: "fail", message: "Database error after update!" } });
                        return;
                    }

                    if (updatedRow.length === 0) {
                        res.send({ result: { status: "fail", message: "Failed to retrieve updated data!" } });
                        return;
                    }

                    let lastText = `Bought book ${updatedRow[0].bookTitle}`;
                    res.send({ result: { status: "success", message: lastText } });
                });
            });
        } else {
            res.send({ result: { status: "fail", message: "Insufficient funds to buy the book!" } });
        }
    });
});

app.get('/search/:bookTopic', async (req, res) => {
    let bookTopic = req.params.bookTopic.trim();
    db.serialize(() => {
        db.all(`SELECT * FROM items WHERE bookTopic="${bookTopic}"`, (err, row) => {
            if (err) {
                console.log(err);
                return;
            }
            res.send({ items: row });
        });
    });
});

app.get('/info/:id', async (req, res) => {
    let id = req.params.id;
    db.serialize(() => {
        db.all(`SELECT id,numberOfItems,bookCost FROM items WHERE id=${id}`, async (err, row) => {
            if (err) {
                console.log(err);
                return;
            }
            res.json({ item: row });
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
