require('dotenv').config();
const express = require('express')
const path = require('path')
const { init } = require('@heroku/salesforce-sdk-nodejs')

const port = process.env.PORT || 5006
const app = express()

// Initialize Salesforce SDK
const sdk = init();

// List of business name components for random generation
const businessTypes = [
  'Tech', 'Global', 'Advanced', 'Innovative', 'Strategic', 'Premier', 'Elite',
  'Dynamic', 'Pacific', 'Atlantic', 'Modern', 'Future', 'Smart', 'Connected',
  'Digital', 'Quantum', 'Unified', 'Integrated', 'Precision', 'Summit'
];

const businessNames = [
  'Solutions', 'Systems', 'Enterprises', 'Industries', 'Dynamics', 'Partners',
  'Networks', 'Technologies', 'Services', 'Innovations', 'Analytics', 'Consulting',
  'Operations', 'Group', 'Corporation', 'Associates', 'International', 'Management',
  'Ventures', 'Labs'
];

const industries = [
  'Manufacturing', 'Software', 'Healthcare', 'Logistics', 'Energy',
  'Communications', 'Engineering', 'Research', 'Development', 'Robotics'
];

// Address components for random generation
const streetTypes = [
  'Street', 'Avenue', 'Boulevard', 'Road', 'Drive', 'Lane', 'Way', 'Circle',
  'Court', 'Place', 'Square', 'Terrace', 'Parkway', 'Plaza'
];

const streetNames = [
  'Maple', 'Oak', 'Cedar', 'Pine', 'Elm', 'Washington', 'Lincoln', 'Park',
  'Lake', 'River', 'Mountain', 'Valley', 'Forest', 'Meadow', 'Spring',
  'Sunset', 'Highland', 'Madison', 'Jefferson', 'Franklin'
];

const cities = [
  'San Francisco', 'New York', 'Chicago', 'Los Angeles', 'Seattle',
  'Boston', 'Austin', 'Denver', 'Miami', 'Portland', 'Atlanta',
  'Dallas', 'Houston', 'Phoenix', 'Minneapolis'
];

const states = [
  { name: 'California', abbr: 'CA' },
  { name: 'New York', abbr: 'NY' },
  { name: 'Texas', abbr: 'TX' },
  { name: 'Florida', abbr: 'FL' },
  { name: 'Illinois', abbr: 'IL' },
  { name: 'Washington', abbr: 'WA' },
  { name: 'Massachusetts', abbr: 'MA' },
  { name: 'Colorado', abbr: 'CO' },
  { name: 'Oregon', abbr: 'OR' },
  { name: 'Georgia', abbr: 'GA' }
];

// Function to generate a random address
function generateAddress() {
  const streetNumber = Math.floor(Math.random() * 9900) + 100; // 100-9999
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const zip = Math.floor(Math.random() * 90000) + 10000; // 10000-99999

  return {
    street: `${streetNumber} ${streetName} ${streetType}`,
    city: city,
    state: state.name,
    stateAbbr: state.abbr,
    zip: zip.toString()
  };
}

// Function to generate a random business name
function generateBusinessName() {
  const type = businessTypes[Math.floor(Math.random() * businessTypes.length)];
  const name = businessNames[Math.floor(Math.random() * businessNames.length)];
  const industry = industries[Math.floor(Math.random() * industries.length)];
  const timestamp = Date.now().toString().slice(-4);
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  // Always prefix with 'Bulk Account' but add random elements after
  const formats = [
    `Bulk Account ${type} ${name} ${randomSuffix}`,
    `Bulk Account ${type} ${industry} ${randomSuffix}`,
    `Bulk Account ${industry} ${name} ${timestamp}`,
    `Bulk Account ${type} ${name} ${industry} ${randomSuffix}`
  ];
  
  const generatedName = formats[Math.floor(Math.random() * formats.length)];
  
  // Ensure name doesn't exceed Salesforce's 255-character limit
  if (generatedName.length > 255) {
    // If somehow too long, return a shorter format
    return `Bulk Account ${type} ${randomSuffix}`;
  }
  
  return generatedName;
}

// Get connection names from environment variable
const connectionNames = process.env.CONNECTION_NAMES ? process.env.CONNECTION_NAMES.split(',') : []

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.get('/', async (req, res) => {
  try {
    // Query accounts from all connected orgs
    const accountsByOrg = await Promise.all(
      connectionNames.map(async (connectionName) => {
        try {
          // Initialize connection for this org
          const org = await sdk.addons.herokuIntegration.getConnection(connectionName.trim())
          console.log('Connected to Salesforce org:', {
            orgId: org.id,
            username: org.user.username
          })

          // Execute SOQL query
          const queryResult = await org.dataApi.query('SELECT Name, Id FROM Account')
          console.log('Query results:', {
            totalSize: queryResult.totalSize,
            done: queryResult.done,
            recordCount: queryResult.records.length
          })

          // Transform the records to the expected format
          const accounts = queryResult.records.map(record => ({
            Name: record.fields.Name,
            Id: record.fields.Id
          }))

          return {
            connectionName: connectionName.trim(),
            accounts
          }
        } catch (error) {
          console.error(`Error querying org ${connectionName}:`, error)
          return {
            connectionName: connectionName.trim(),
            error: error.message,
            accounts: []
          }
        }
      })
    )

    res.render('pages/index', { accountsByOrg })
  } catch (error) {
    console.error('Error rendering index:', error)
    res.status(500).send(error.message)
  }
})

// Store job status in memory (in production, use Redis or another persistent store)
const jobStatus = new Map();

/**
 * Bulk API Demo Endpoint
 * 
 * Technical Notes on Duplicate Handling:
 * ------------------------------------
 * This demo intentionally showcases real-world scenarios including error handling for duplicate records.
 * Some account insertions may fail due to Salesforce's duplicate detection rules, which is expected behavior.
 * 
 * Key Points:
 * 1. Partial Success: Even if some records fail due to duplicates, successfully inserted records will still
 *    appear on the main page, demonstrating resilient bulk processing.
 * 2. Error Handling: The monitorBulkJob function logs failed records, providing visibility into which
 *    insertions failed and why.
 * 3. Options for Users:
 *    - Accept partial success as a demonstration of error handling
 *    - Temporarily disable duplicate rules in Salesforce to allow all insertions
 *    - Review failed records in the application logs for debugging
 * 
 * This behavior actually provides a valuable demonstration of:
 * - Real-world bulk data handling
 * - Salesforce duplicate management in action
 * - Robust error handling in bulk operations
 * - Integration resilience
 */
app.get('/bulk-demo', async (req, res) => {
  try {
    const emptyOrgName = 'empty-org'
    
    if (!connectionNames.includes(emptyOrgName)) {
      return res.status(400).send('empty-org connection not found')
    }

    // Initialize connection for empty-org
    const org = await sdk.addons.herokuIntegration.getConnection(emptyOrgName)
    console.log('Connected to empty-org:', {
      orgId: org.id,
      username: org.user.username
    })

    // First check for existing records using regular query
    const queryResult = await org.dataApi.query('SELECT Id FROM Account WHERE Name LIKE \'Bulk Account%\'')
    console.log('Query results:', {
      totalSize: queryResult.totalSize,
      done: queryResult.done,
      recordCount: queryResult.records.length
    })

    if (queryResult.records.length === 0) {
      // No existing bulk records, create them using Bulk API
      console.log('Starting Bulk API process for \'empty-org\'')

      // Create a data table for bulk insert
      const columns = ['Name', 'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry']
      const dataTableBuilder = org.bulkApi.createDataTableBuilder(columns)
      
      // Add 1000 records to the data table
      for (let i = 1; i <= 1000; i++) {
        const address = generateAddress();
        const record = new Map()
        record.set('Name', generateBusinessName())
        record.set('BillingStreet', address.street)
        record.set('BillingCity', address.city)
        record.set('BillingState', address.state)
        record.set('BillingPostalCode', address.zip)
        record.set('BillingCountry', 'United States')
        dataTableBuilder.addRow(record)
      }

      // Create bulk job for inserting accounts
      const ingestResults = await org.bulkApi.ingest({
        object: 'Account',
        operation: 'insert',
        dataTable: dataTableBuilder.build()
      })

      // Start monitoring process in background
      monitorBulkJob(org, ingestResults[0]);

      return res.json({
        message: 'Bulk insert job started',
        jobId: ingestResults[0].id
      });
    }

    res.json({
      message: `Found ${queryResult.records.length} existing bulk-created records`,
      status: 'EXISTING_RECORDS'
    });
  } catch (error) {
    console.error('Error in bulk demo:', error)
    res.status(500).send(error.message)
  }
})

// Background job monitoring function
async function monitorBulkJob(org, result) {
  try {
    let isComplete = false;
    while (!isComplete) {
      const jobInfo = await org.bulkApi.getInfo(result);
      console.log('Bulk job status:', {
        id: result.id,
        state: jobInfo.state,
        numberRecordsProcessed: jobInfo.numberRecordsProcessed,
        numberRecordsFailed: jobInfo.numberRecordsFailed
      });

      isComplete = ['JobComplete', 'Failed', 'Aborted'].includes(jobInfo.state);

      if (isComplete) {
        if (jobInfo.state === 'JobComplete') {
          if (jobInfo.numberRecordsFailed > 0) {
            const failedResults = await org.bulkApi.getFailedResults(result);
            console.error('Failed records:', failedResults);
          } else {
            console.log(`Job ${result.id} completed successfully. Processed ${jobInfo.numberRecordsProcessed} records`);
          }
        } else {
          console.error(`Job ${result.id} ended in state: ${jobInfo.state}`);
        }
      } else {
        // Wait 5 seconds before next status check
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error('Error monitoring bulk job:', error);
  }
}

const server = app.listen(port, () => {
  console.log(`Listening on ${port}`)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: gracefully shutting down')
  if (server) {
    server.close(() => {
      console.log('HTTP server closed')
    })
  }
})
