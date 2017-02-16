import fs from 'fs';
import cheerio from 'cheerio';
import axios from 'axios';
import Nightmare from 'nightmare';

const START_URL = 'http://www.freeformportland.org/schedule';

const visitInitialPage = async (url, nightmare, callback) => {
    console.log(`Visiting page ${url}...`);

    try {
        const { status, data } = await axios.get(url);

        console.log(`Status code: ${status}`);

        if (status === 200) {
            const $ = cheerio.load(data);
            const links = collectInitialLinks($);
            callback(links, nightmare);
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

const crawler = (links, nightmare) => {
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
            const html = document.querySelectorAll('.playlist-list')[0].outerHTML;

            return {
                showName,
                djName,
                html
            };
        })
        // .end()
        .then(result => {
            const { html, showName, djName } = result;
            const $ = cheerio.load(html);

            const playlists = $('.playlist-list > li').map((i, elem) => {
                const date = $(elem).find('h3').text();
                const songs = $(elem).find('ul li');

                const playlist = songs.map((i, elem) =>  {
                    const title = $(elem).find('.song-title').text();
                    const artist = $(elem).find('.song-artist').text();

                    return {
                        artist,
                        title
                    };
                }).get();

                return {
                    date,
                    playlist
                };
            }).get();

            const data = {
                showName,
                djName,
                playlists
            };

            try {
                const json = JSON.stringify(data);
                const filePath = `files/${data.showName}.json`;

                fs.writeFile(filePath, json, (err) => {
                    if (err) {
                        throw err;
                    }

                    crawler(links, nightmare);
                });
            } catch (e) {
                console.log(e);
            }
        })
        .catch(e => console.log(e));
};
const nightmare = new Nightmare();
visitInitialPage(START_URL, nightmare, crawler);
