import cheerio from 'cheerio';
import axios from 'axios';
import Nightmare from 'nightmare';

const START_URL = 'http://www.freeformportland.org/schedule';

const visitInitialPage = async (url, callback) => {
    console.log(`Visiting page ${url}...`);

    try {
        const { status, data } = await axios.get(url);

        console.log(`Status code: ${status}`);

        if (status === 200) {
            const $ = cheerio.load(data);
            const links = collectInitialLinks($);
            callback(links);
        }

    } catch (e) {
        console.log(e);
    }
};

const collectInitialLinks = ($) => {
    const absoluteLinks = $('.schedule-block a');
    console.log(`Found ${absoluteLinks.length} relative links on page.`);

    return absoluteLinks.map((i, link) => $(link).attr('href')).get();
};

const crawler = (links) => {
    const nightmare = new Nightmare({ show: true });

    nightmare
        .goto(links[0])
        .wait(10000)
        .evaluate(function () {
            const showName = document.getElementsByClassName('entry-title')[0].innerHTML;
            const djName = document.getElementsByClassName('dj-name')[0].innerHTML;
            const html = document.querySelectorAll('.playlist-list')[0].outerHTML;

            return {
                showName,
                djName,
                html
            }
        })
        .end()
        .then(result => {
            const $ = cheerio.load(result.html) // an html string

            $('.playlist-list > li').map((i, elem) => {
                console.log($(elem).find('h3').text()); // logs all dates
            });


            // const playlists = playlistBlock.map(o => ({
            //     date: o.children[0],
            // });

            process.exit(0);
        })
        .catch(e => console.log(e));
};

visitInitialPage(START_URL, crawler);
