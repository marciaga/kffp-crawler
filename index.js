import MongoClient from 'mongodb';
import cheerio from 'cheerio';
import axios from 'axios';
import Nightmare from 'nightmare';

const DB_NAME = 'legacy-playlist';
const DB_URL = `mongodb://localhost:27017/${DB_NAME}`;
const DB_COLLECTION = 'shows';
const START_URL = 'http://www.freeformportland.org/schedule';

const main = () => {
    MongoClient.connect(DB_URL, async (err, db) => {
        if (err) {
            throw new Error(`Error connecting to Mongo: ${err}`);
        }

        try {
            const nightmare = new Nightmare();
            const { result } = await db.collection(DB_COLLECTION).deleteMany({});

            if (result.ok) {
                return visitInitialPage(START_URL, db, nightmare, crawler);
            }

            throw new Error('Something went wrong attempting to delete from Mongo');
        } catch (e) {
            console.log(e);
            process.exit(1);
        }
    });
};

const visitInitialPage = async (url, db, nightmare, callback) => {
    console.log(`Visiting page ${url}...`);

    try {
        const { status, data } = await axios.get(url);

        console.log(`Status code: ${status}`);

        if (status === 200) {
            const $ = cheerio.load(data);
            const links = collectInitialLinks($);
            callback(links, db, nightmare);
        }

    } catch (e) {
        console.log(e);
    }
};

const collectInitialLinks = ($) => {
    const absoluteLinks = $('.schedule-block a');
    console.log(`Found ${absoluteLinks.length} absolute links on page.`);

    return absoluteLinks.map((i, link) => $(link).attr('href')).get();
};

const insertOne = async (doc, links, nightmare, db) => {
    try {
        const result = await db.collection(DB_COLLECTION).insertOne(doc);

        if (result.insertedCount === 1) {
            return crawler(links, db, nightmare);
        }

        throw new Error('Insert failed...exiting');
    } catch (e) {
        console.log(e);
    }
};

const crawler = (links, db, nightmare) => {
    if (!links.length) {
        process.exit(0);
    }

    const url = links.shift();

    console.log(`Going to ${url}`);
    nightmare
        .goto(url)
        .wait(10000)
        .evaluate(function () {
            const showName = document.getElementsByClassName('entry-title')[0].innerHTML;
            const djName = document.getElementsByClassName('dj-name')[0].innerHTML;
            const description = document.querySelectorAll('.entry-content p')[0].outerHTML;
            const html = document.querySelectorAll('.playlist-list')[0].outerHTML;

            return {
                showName,
                djName,
                description,
                html
            };
        })
        .then(result => {
            const { html, showName, djName, description } = result;
            const $ = cheerio.load(html);

            const playlists = $('.playlist-list > li').map((i, elem) => {
                const date = $(elem).find('h3').text();
                const songs = $(elem).find('ul li');

                const playlist = songs.map((i, elem) =>  {
                    const title = $(elem).find('.song-title').text();
                    const artist = $(elem).find('.song-artist').text();
                    const album = $(elem).find('.song-album').text();
                    const label = $(elem).find('.song-label').text();
                    const timestamp = $(elem).find('.song-timestamp').text();

                    return {
                        artist,
                        title,
                        album,
                        label,
                        timestamp
                    };
                }).get();

                return {
                    date,
                    playlist
                };
            }).get();

            const doc = {
                showName,
                djName,
                description,
                playlists
            };
            // write to mongo
            insertOne(doc, links, nightmare, db);
        })
        .catch(e => console.log(e));
};

main();
