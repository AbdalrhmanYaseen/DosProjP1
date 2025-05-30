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

// Health check endpoint for auto-scaling
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'order-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Metrics endpoint for monitoring and scaling decisions
app.get('/metrics', (req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
        service: 'order-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
        },
        cpu: process.cpuUsage()
    });
});

app.listen(port, () => {
    console.log(`Order service running on http://localhost:${port}`);
});
