import { MongoClient } from 'mongodb';
import axios from 'axios';

const DB_URL = 'mongodb://localhost:27017/test';

MongoClient.connect(DB_URL, (err, db) => {
    if (err) {
        throw new Error(`Error connecting to MongoDB: ${err}`);
    }

    const mongodb = db;

    main(mongodb);
});

const main = (mongodb) => {
    const { db } = mongodb;

    process.exit();
};


// API requests will be of the form http://kffp.rocks/api/setlistsByShowID/[KFFP10729]
