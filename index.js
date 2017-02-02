import cheerio from 'cheerio';
import axios from 'axios';
import Nightmare from 'nightmare';

const START_URL = 'http://www.freeformportland.org/schedule';

const visitInitialPage = async (url, callback) => {
    console.log(`Visiting page ${url}...`);

    try {
        const result = await axios.get(url);
        const { status, data } = result;

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
    const relativeLinks = $('.schedule-block a');
    console.log(`Found ${relativeLinks.length} relative links on page.`);

    return relativeLinks.map((i, link) => $(link).attr('href')).get();
};

const crawler = (links) => {
    const nightmare = new Nightmare({ show: true });

    nightmare
        .goto(links[0])
        .wait(5000)
        .evaluate(function () {
            const showName = document.getElementsByClassName('entry-title')[0].innerHTML;


            return {
                showName,
                dj: 'Meow'
            }
        })
        .then(text => console.log(text))
        .run((err, nightmare) => {
            console.log('done');
            nightmare.end();
        });

    // spin up nightmare and go to town
    // process.exit(0);
};


visitInitialPage(START_URL, crawler);
