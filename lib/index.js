import { MongoClient } from 'mongodb';
import axios from 'axios';
import showIds from './showData';

const DB_URL = 'mongodb://localhost:27017/legacy-playlist';
const API_URL = 'http://kffp.rocks/api/setlistsByShowID';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36';

MongoClient.connect(DB_URL, (err, db) => {
    if (err) {
        throw new Error(`Error connecting to MongoDB: ${err}`);
    }

    const mongodb = db;

    main(mongodb);
});

const performApiRequest = async (id, db, callback) => {
    const url = `${API_URL}/${id}`;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT }
        });
        // write data to MongoDB
        console.log(data);
        callback();
    } catch (err) {
        console.log(err);
    }
};

const main = (mongodb) => {
    const { db } = mongodb;

    const requests = showIds.map((id, i) => {
        return new Promise(resolve => setTimeout(() => performApiRequest(id, db, resolve), i * 1000));
    });

    Promise.all(requests).then(() => process.exit());
};

// API requests will be of the form http://kffp.rocks/api/setlistsByShowID/[KFFP10729]
