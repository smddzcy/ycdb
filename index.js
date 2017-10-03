const request = require('request-promise');
const cheerio = require('cheerio')
const fs = require('fs');

const LIVE = 0;
const EXITED = 1;
const DEAD = 2;
const UNKNOWN_STATUS = -1;

const companies = []

request('https://www.snappr.co/ycdb').then(async (html) => {
  let $ = cheerio.load(html)
  const itemLists = $('.top.w-row.ycdb-table-row').nextAll('.w-dyn-list');
  for (let j = 0; j < itemLists.length; j++) {
    const items = $(itemLists[j]).find('.w-dyn-item');
    for (let i = 0; i < items.length; i++) {
      const cols = $(items[i]).find('.w-col')
      const favicon = $(cols[0]).find('img').attr('src')
      const name = $(cols[0]).find('a').text()
      const batch = $(cols.get(1)).text()
      const domain = $(cols.get(2)).text()
      const description = $(cols.get(3)).text()
      const location = $(cols.get(4)).text()
      const status = (() => {
        switch ($(cols.get(5)).text().replace(/\s/g, "").toLowerCase()) {
          case 'live':
            return LIVE;
          case 'exited':
            return EXITED;
          case 'dead':
            return DEAD;
          default:
            return UNKNOWN_STATUS;
        }
      })()

      const company = {
        name, favicon, batch, domain, description, location, status
      }
      const link = $(cols.get(0)).find('a').attr('href')
      console.log(link)
      const html = await request('https://www.snappr.co' + link);
      $ = cheerio.load(html)

      const categories = $($('.ycdb-categories').get(0)).text().split(',')
        .map(str => str.trim())
      const yearFounded = parseInt($($('.ycdb-right-column').find('.w-embed')
        .get(1)).text().substring(9)) || 0

      const blocks = $('.ycdb-block')
      const getBlockText = i => $($(blocks.get(i)).find('.w-embed').get(1)).text()
      const alexaRank = parseInt((getBlockText(0).match(/\d+/) || []) [0]) || 0
      const amountRaised = ((getBlockText(1).match(/\$.*/) || [])[0]) || '$0'
      const twitterFollowers = parseInt((getBlockText(2).match(/\d+/) || []) [0]) || 0
      const productHuntUpvotes = parseInt((getBlockText(3).match(/\d+/) || []) [0]) || 0
      const crunchBaseRank = parseInt((getBlockText(4).match(/\d+/) || []) [0]) || 0
      const mozDomainAuthority = parseInt((getBlockText(5).match(/\d+/) || []) [0]) || 0

      company.categories = categories
      company.yearFounded = yearFounded
      company.stats = {
        alexaRank, amountRaised, twitterFollowers, productHuntUpvotes,
        crunchBaseRank, mozDomainAuthority,
      }
      companies.push(company)
    }
  }

  fs.writeFile('./db.json', JSON.stringify(companies), (err) => {
    if (err) {
      console.log("Error while saving the data to file: ")
      console.error(err)
      return
    }
    console.log("Saved to db.json!")
  })
})
