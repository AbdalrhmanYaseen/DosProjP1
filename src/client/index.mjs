
import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import axios from "axios";
import express from 'express';
import cors from 'cors';


  const program = new Command();
  program.name('CLI').description('CLI for DOS Project').version('1.0.0');
  let questionSearch = [
    {
      type: 'input',
      name: 'bookTitle',
      message: 'please enter book topic to get details about it: ',
    },
  ];

  let questionInfo=[{
    type: 'number',
    name: 'itemNumber',
    message: 'please enter items number to get info about it: ',
  },]

  let questionPurchase = [{
    type: 'number',
    name: 'itemNumber',
    message: 'please enter book item number to purchase it: ',
  },
  {
    type: 'number',
    name: 'money',
    message: 'Enter amount of money to pay:  ',
  },
]

  program
    .command('search-book-title')
    .alias('s')
    .description('search about specific book using book topic')
    .action(() => {
      inquirer
        .prompt(questionSearch)
        .then(async (answers) => {
          try {
            const result = await axios.get(`http://nginx/catalog-server/search/${answers.bookTitle}`);
            console.log('Response Data:', result.data);
          } catch (error) {
            console.error('Error during request:', error.message);
          }

        })
        .catch((error) => {
          if (error.isTtyError) {

          } else {

          }
        });
    });

    program
    .command('info-book-item-number')
    .alias('i')
    .description('info about specific book using item number')
    .action(() => {
      inquirer
        .prompt(questionInfo)
        .then(async (answers) => {
          try {
            const result = await axios.get(`http://nginx/catalog-server/info/${answers.itemNumber}`);
            console.log('Response Data:', result.data);
          } catch (error) {
            console.error('Error during request:', error.message);
          }
        })
        .catch((error) => {
          if (error.isTtyError) {
          } else {
          }
        });
    });

    program
    .command('purchase-book-by-item-number')
    .alias('p')
    .description('purchase specific book using item number')
    .action(() => {
      inquirer
        .prompt(questionPurchase)
        .then(async (answers) => {
          // console.log(answers)
          // console.log(answers.purchase)
            try {
              const result = await axios.post(`http://nginx/order-server/purchase`,{id:answers.itemNumber,orderCost:answers.money})
              console.log('Response Data:', result.data);
            } catch (error) {
              console.error('Error during request:', error.message);
            }
        })
        .catch((error) => {
          if (error.isTtyError) {
          } else {
          }
        });
    });

// Check if we should run CLI or web server
if (process.argv.length > 2) {
  // CLI mode - parse arguments
  program.parse();
} else {
  // Web server mode - no CLI arguments provided
  console.log('Starting web server mode...');

  // Web Server for Client Interface
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve a simple HTML interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>DOS Project Client</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            input, button { padding: 10px; margin: 5px; }
            button { background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
            button:hover { background-color: #0056b3; }
            .result { margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>DOS Project Client Interface</h1>

            <div class="section">
                <h3>Search Books by Topic</h3>
                <input type="text" id="searchTopic" placeholder="Enter book topic">
                <button onclick="searchBooks()">Search</button>
                <div id="searchResult" class="result"></div>
            </div>

            <div class="section">
                <h3>Get Book Info by ID</h3>
                <input type="number" id="bookId" placeholder="Enter book ID">
                <button onclick="getBookInfo()">Get Info</button>
                <div id="infoResult" class="result"></div>
            </div>

            <div class="section">
                <h3>Purchase Book</h3>
                <input type="number" id="purchaseId" placeholder="Enter book ID">
                <input type="number" id="orderCost" placeholder="Enter amount to pay">
                <button onclick="purchaseBook()">Purchase</button>
                <div id="purchaseResult" class="result"></div>
            </div>
        </div>

        <script>
            async function searchBooks() {
                const topic = document.getElementById('searchTopic').value;
                const resultDiv = document.getElementById('searchResult');

                try {
                    const response = await fetch(\`/api/search/\${topic}\`);
                    const data = await response.json();
                    resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    resultDiv.innerHTML = 'Error: ' + error.message;
                }
            }

            async function getBookInfo() {
                const id = document.getElementById('bookId').value;
                const resultDiv = document.getElementById('infoResult');

                try {
                    const response = await fetch(\`/api/info/\${id}\`);
                    const data = await response.json();
                    resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    resultDiv.innerHTML = 'Error: ' + error.message;
                }
            }

            async function purchaseBook() {
                const id = document.getElementById('purchaseId').value;
                const orderCost = document.getElementById('orderCost').value;
                const resultDiv = document.getElementById('purchaseResult');

                try {
                    const response = await fetch('/api/purchase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: parseInt(id), orderCost: parseFloat(orderCost) })
                    });
                    const data = await response.json();
                    resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    resultDiv.innerHTML = 'Error: ' + error.message;
                }
            }
        </script>
    </body>
    </html>
  `);
});

// API endpoints that proxy to the backend services
app.get('/api/search/:topic', async (req, res) => {
  try {
    const result = await axios.get(`http://nginx/catalog-server/search/${req.params.topic}`);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/info/:id', async (req, res) => {
  try {
    const result = await axios.get(`http://nginx/catalog-server/info/${req.params.id}`);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/purchase', async (req, res) => {
  try {
    const result = await axios.post('http://nginx/order-server/purchase', req.body);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint for auto-scaling
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'client',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint for monitoring and scaling decisions
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    service: 'client',
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

const PORT = process.env.PORT || 3007;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Client web server running on http://0.0.0.0:${PORT}`);
});

}