const fs = require('fs');
const path = require('path');
require('dotenv').config();

const scraperObject = {
    url: 'https://www.himama.com/login',
    async scraper(browser){
        let screenshot = 'himama.png'

        // create new page in browser and navigate to himama
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        await page.goto(this.url);

        // login
        await page.type('#user_login', process.env.HIMAMA_USERNAME)
        await page.type('#user_password', process.env.HIMAMA_PASSWORD)
        await page.click('[name="commit"]')
        await page.waitForNavigation()

        // close modal popup
        await page.$$eval('button.contacts-close-button', links => links.forEach(link => link.click()))

        // loop through all pictures
        await page.waitForSelector('img.thumbnail-image');
        let urls = await page.$$eval('[data-type=image]', divs => {
            divs = divs.map(el => el.getAttribute('data-srcimg'))
            return divs
        })
        urls = urls.filter(function(elem, pos) {
            return urls.indexOf(elem) == pos;
        })
        console.log(urls);

        // save images
        let pagePromise = (link) => new Promise(async(resolve, reject) => {
            let dataObj = {};
            let newPage = await browser.newPage();

            newPage.on('response', async response => {
                const url = response.url();
                console.log('response was type ' + response.request().resourceType());
                if (response.request().resourceType() === 'document') {
                    response.buffer().then(file => {

                        // Naming logic
                        const filePath = process.env.STORAGE_PATH;
                        const fileNameParts = url.split('/');
                        let fileName = fileNameParts.pop();
                        while (fileName.includes('.jpeg') != true) {
                            fileName = fileNameParts.pop();
                        }
                        fileName = fileName.split('?')[0]

                        // download if it doesnt already exist
                        if (fs.existsSync(filePath+fileName)) {
                            console.log(fileName + ' already exists')
                        } else {
                            console.log('writing file ' + fileName + ' to ' + filePath);
                            const writeStream = fs.createWriteStream(filePath+fileName);
                            writeStream.write(file);
                        }

                    });
                }
            });

            await newPage.goto(link);
            await newPage.close()
            resolve(link);

        })

        for(let link in urls){
            let currentPageData = await pagePromise(urls[link]);
            // scrapedData.push(currentPageData);
            console.log(currentPageData);
        }

        // close
        browser.close()

    }
}

module.exports = scraperObject;