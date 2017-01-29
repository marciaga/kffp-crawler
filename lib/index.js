import { MongoClient } from 'mongodb';
import axios from 'axios';
import showIds from './showData';

const DB_NAME = 'legacy-playlist';
const DB_URL = `mongodb://localhost:27017/${DB_NAME}`;
const DB_COLLECTION = 'playlists';
const API_URL = 'http://kffp.rocks/api/setlistsByShowID';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36';

MongoClient.connect(DB_URL, async (err, db) => {
    if (err) {
        throw new Error(`Error connecting to MongoDB: ${err}`);
    }

    const mongodb = db;

    try {
        const { result } = await mongodb.collection(DB_COLLECTION).deleteMany({});

        if (result.ok) {
            return main(mongodb);
        }

        throw new Error('Something went wrong attempting to delete from Mongo');
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
});

const performApiRequest = async (id, db, callback) => {
    const url = `${API_URL}/${id}`;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT }
        });

        const doc = data.length > 0 ? data[0] : {};
        const result = await db.collection(DB_COLLECTION).insertOne(doc);

        if (result.insertedCount) {
            return callback();
        }

        throw new Error('Mongo insert was not successful');
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};

const main = (mongodb) => {
    const requests = showIds.map((id, i) => {
        return new Promise(resolve => setTimeout(() => performApiRequest(id, mongodb, resolve), i * 1000));
    });

    Promise.all(requests).then(() => process.exit());
};

// API requests will be of the form http://kffp.rocks/api/setlistsByShowID/[KFFP10729]
