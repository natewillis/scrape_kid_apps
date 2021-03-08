const fs = require('fs');
const path = require('path');
require('dotenv').config();

const scraperObject = {
    url: 'https://www.himama.com/login',
    async scraper(browser){

        // HIMAMA
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
        let himamaImageLinks = await page.$$eval('[data-type=image]', divs => {
            divs = divs.map(el => el.getAttribute('data-srcimg'))
            return divs
        })

        // combine urls into master list
        let urls = himamaImageLinks;

        // Make sure our urls are unique
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
                        while (fileName.includes('.jp') != true){
                            fileName = fileNameParts.pop();
                        }
                        fileName = fileName.split('?')[0]
                        fileName = fileName.split('.jp')[0] + '.jpg'
                        let absPath = filePath + '\\' + fileName;

                        // download if it doesnt already exist
                        if (fs.existsSync(absPath)) {
                            console.log(absPath + ' already exists')
                        } else {
                            console.log('writing file ' + fileName + ' to ' + filePath);
                            const writeStream = fs.createWriteStream(absPath);
                            writeStream.write(absPath);
                        }

                    });
                }
            });

            await newPage.goto(link);
            await newPage.close()
            resolve(link);

        })

        // apply image save function to all the urls
        for(let link in urls){
            let currentPageData = await pagePromise(urls[link]);
            // scrapedData.push(currentPageData);
            console.log(currentPageData);
        }

        // PROCARE
        let procareUrl = 'https://schools.procareconnect.com/login'
        let proPage = await browser.newPage();
        console.log(`Navigating to ${procareUrl}...`);
        await proPage.goto(procareUrl);

        // login
        await proPage.type('#email', process.env.PROCARE_USERNAME);
        await proPage.type('#password', process.env.PROCARE_PASSWORD);
        await proPage.click('button');
        await proPage.waitForNavigation();
        await proPage.waitForSelector('a.carer-dashboard__content-link');


        // find gallery link
        const hrefs = await proPage.$$eval('a.carer-dashboard__content-link', links => links.map(a => a.href));
        let galleryLink;
        for (let index = 0; index < hrefs.length; ++index) {
            let value = hrefs[index];
            if (value.includes('photos')) {
                galleryLink = value;
                break;
            }
        }

        // navigate to the gallery
        await proPage.goto(galleryLink);
        await proPage.waitForSelector('div.gallery__item-container');

        // click the div
        console.log('before the div');

        const elementHandles = await proPage.$$('a.gallery__item-download');
        const downloadHREFHandles = await Promise.all(
            elementHandles.map(handle => handle.getProperty('download'))
        )
        const downloadHREFs = await Promise.all(
            downloadHREFHandles.map(handle => handle.jsonValue())
        );

        console.log('should download ' + downloadHREFs.length + ' files');
        for (let i=0; i<downloadHREFs.length; i++) {
            let singleHREF = downloadHREFs[i];
            let filename = singleHREF.split('/').pop().split('?')[0];
            if (fs.existsSync(process.env.STORAGE_PATH + '\\' + filename)) {
                console.log(filename + ' already exists!')
            } else {
                console.log('downloading ' + filename);
                let downloadPage = await browser.newPage();
                await downloadPage._client.send('Page.setDownloadBehavior', {
                    behavior: 'allow',
                    downloadPath: process.env.STORAGE_PATH,
                });
                try {
                    await downloadPage.goto(singleHREF);
                    await downloadPage.waitForTimeout(1000);
                    await downloadPage.close();
                } catch (e) {
                    console.log('there was an error!')
                    await downloadPage.waitForTimeout(1000);
                    await downloadPage.close();
                }
            }
        }
        console.log('after the div')






        // close
        browser.close()

    }
}

module.exports = scraperObject;