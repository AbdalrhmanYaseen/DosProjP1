const express = require('express');
const axios = require('axios');
const app = express();
const port = 4000;

app.use(express.json());

const catalogURL = 'http://catalog:5000';

app.post('/purchase/:id', async (req, res) => {
    const itemId = req.params.id;

    try {
        const infoRes = await axios.get(`${catalogURL}/info/${itemId}`);
        const item = infoRes.data.item[0];

        if (!item || item.numberOfItems <= 0) {
            return res.status(400).json({ status: 'fail', message: 'Item out of stock' });
        }

        const updatedQuantity = item.numberOfItems - 1;
        await axios.put(`${catalogURL}/update/${itemId}`, {
            numberOfItems: updatedQuantity
        });

        return res.status(200).json({
            status: 'success',
            message: `Book with id ${itemId} purchased successfully`
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ status: 'error', message: 'Purchase failed' });
    }
});

app.listen(port, () => {
    console.log(`Order service running on http://localhost:${port}`);
});
