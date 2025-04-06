const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const cors = require('cors');
const app = express();

const port = 4005;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/purch', async (req, res) => {
    const { id, orderCost } = req.body;
    const order = { id, orderCost };

    try {
        const response = await axios.post('http://catalog-server:3005/order', order);
        console.log(response.data);
        res.send({ message: 'Request sent to Catalog' });
    } catch (err) {
        console.error(err);
        res.status(400).send({ error: err.message });
    }
});

app.get('/test', (req, res) => {
    res.send({ message: 'Arrive' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

