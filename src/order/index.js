const express = require('express');
const axios = require('axios');
const app = express();
const port = 4000;

app.use(express.json());

app.post("/purchase",async (req,res)=>{

    const order = {
        "id":req.body.id,
        "orderCost":req.body.orderCost
    };
    try{
        const response = await axios.post(`http://catalog-server:5000/order`,order);
        console.log(response.data)

        res.send({message:"Send Request To Catalog"})
    } catch(err){
        console.log(err)
        res.status(400).send({error:err})
    }
})

app.listen(port, () => {
    console.log(`Order service running on http://localhost:${port}`);
});
