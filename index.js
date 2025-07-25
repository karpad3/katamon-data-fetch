require('dotenv').config();

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const app = express();

const {
    SEASON_ID,
    SEASON,
    SITE_URL,
    S3_ACCESS_KEY,
    S3_ACCESS_SECRET,
    S3_UPLOADS_BUCKET,
    S3_PUBLIC_PATH
} = process.env;

const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_ACCESS_SECRET
});

const scrapeGames = async (teamId) => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ignoreHTTPSErrors: true,
        headless: false
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    page.on('console', consoleObj => console.log(consoleObj.text()));   // Enables console prints in evaluate callback
    await page.goto(`https://football.org.il/team-details/team-games/?team_id=${teamId}&season_id=${SEASON_ID}`)

    await page.addScriptTag({path: "functions.js"});

    const leagueGames = await page.evaluate(async (season) => {
        const data = [];

        try {
            const table = document.querySelector('.table_row_group');
            const games = table.querySelectorAll('.table_row');

            games.forEach((game, index) => {
                data.push(getGameData(game, index, 'league', season));
            });
        } catch(e) {
            console.log("Error getting games. Skipping.");
            console.log(e);
        }

        return data;
    }, SEASON);

    if (leagueGames == []) {
        console.log(await page.content());
    }

    // Fix indexing when there are null games
    let ignoredLeagueGames = 0;
    for (game of leagueGames) {
        if (game == null || (game.finished && game.gameId == -1)) {
            ignoredLeagueGames++;
        }
        else {
            game.number -= ignoredLeagueGames;
            game._id = game._id.split("-")[0] + "-" + game._id.split("-")[1] + "-" + (parseInt(game._id.split("-")[2], 10) - ignoredLeagueGames);
        }
    }

    try {
        await Promise.all([
              page.waitForNavigation(),
              page.goto(`https://football.org.il/en/team-details/team-games/?team_id=${teamId}`)
        ]);

        await page.addScriptTag({path: "functions.js"});

        const englishGames = await page.evaluate((season) => {
            const data = [];
            const table = document.querySelector('.table_row_group');
            const games = table.querySelectorAll('.table_row');

            games.forEach((game, index) => {
                data.push(getGameData(game, index, 'league', season, true));
            });
            return data;
        }, SEASON);

        leagueGames.forEach((game, i) => {
            if (game != null && (!game.finished || game.gameId != -1)) {
                const endate = englishGames[i] && englishGames[i].date;
                const gameIndex = englishGames.findIndex(x => x.date === game.date);
                if (gameIndex != -1) {
                    game.locationEN = englishGames[gameIndex].location;
                }
            }
        });
    } catch(e) {
        console.log("Error getting english games. Skipping.");
        console.log(e);
    }

    await Promise.all([
          page.waitForNavigation(),
          page.goto('https://www.football.org.il/team-details/?team_id=${teamId}')
    ]);

    await page.addScriptTag({path: "functions.js"});

    const totoGames = await page.evaluate((season) => {

        const gamesRaw = document.querySelectorAll('a[href*=\game_id]');

        const _totoGames = []
        gamesRaw.forEach((game, index) => {
          // get only toto games
            if(game.innerText.includes('טוטו') && game.innerText.includes('תוצאה')){
                _totoGames.push(game);
            }
        });

        return _totoGames.map((game, index) => getGameData(game, index, 'toto', season));
    }, SEASON);


    browser.close();

    // Remove null values and invalid games
    return leagueGames.concat(totoGames).filter(g => g && (!g.finished || g.gameId != -1));
};

app.get('/getGames', function (req, res) {
    scrapeGames(5981).then((value) => {
        res.send(JSON.stringify(value));
    });

});

app.get('/getWomenGames', function (req, res) {
    scrapeGames(7196).then((value) => {
        res.send(JSON.stringify(value));
    });

});

const scrapeLeagueTable = async (leagueId) => {
// const scrapeLeagueTable = async (teamId) => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: false
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    page.on('console', consoleObj => console.log(consoleObj.text()));   // Enables console prints in evaluate callback
console.log(`https://www.football.org.il/leagues/league/?league_id=${leagueId}&season_id=${SEASON_ID}`)
    await page.goto(`https://www.football.org.il/leagues/league/?league_id=${leagueId}&season_id=${SEASON_ID}`);
    // await page.goto(`https://www.football.org.il/team-details/?team_id=${teamId}&season_id=${SEASON_ID}`);
    const result = await page.evaluate((season) => {
        const leageData = [];
        const teams = document.querySelectorAll('.table-w-playoff .table_row')
        let leagueStarted = false;
        let previousRank = 0;
        let additionToRank = 0;
        teams.forEach((team, index) => {
            const res = {};

            res._id = `${season}-${index + 1}`;

            const teamIdIndex =  team.href && team.href.search('team_id')
            const teamIdHref = teamIdIndex > 0 && team.href.slice(teamIdIndex)

            res.teamId = teamIdHref && teamIdHref.split("=")[1].trim()

            ind = [0, 1, 2, 3, 4, 5, 6, 7]
            // ind = [1, 3, 5, 7, 9, 11, 13, 15]
            const rankSR = team.childNodes[ind[0]].children[0].innerText;

            res.rank = parseInt(team.childNodes[ind[0]].innerText.replace(rankSR, ''));
            if (additionToRank > 0) {
                res.rank += additionToRank;
            }
            else if (res.rank < previousRank) {
                additionToRank = previousRank;
                res.rank += additionToRank;
            }
            previousRank = res.rank;
            const teamNameSR = team.childNodes[ind[1]].children[0].innerText;
            res.teamName = team.childNodes[ind[1]].innerText.replace(teamNameSR, '').replace('י-ם', 'ירושלים').trim();

            const amountOfGamesSR = team.childNodes[ind[2]].children[0].innerText;
            res.amountOfGames = team.childNodes[ind[2]].innerText.replace(amountOfGamesSR, '').trim();

            const amountOfWinsSR = team.childNodes[ind[3]].children[0].innerText;
            res.amountOfWins = team.childNodes[ind[3]].innerText.replace(amountOfWinsSR, '').trim();

            const amountOfTieSR = team.childNodes[ind[4]].children[0].innerText;
            res.amountOfTie = team.childNodes[ind[4]].innerText.replace(amountOfTieSR, '').trim();

            const amountOfLosesSR = team.childNodes[ind[5]].children[0].innerText;
            res.amountOfLoses = team.childNodes[ind[5]].innerText.replace(amountOfLosesSR, '').trim();

            const amountOfGolesSR = team.childNodes[ind[6]].children[0].innerText;
            res.amountOfGoles = team.childNodes[ind[6]].innerText.replace(amountOfGolesSR, '').trim();

            const pointesSR = team.childNodes[ind[7]].children[0].innerText;
            res.points = team.childNodes[ind[7]].innerText.replace(pointesSR, '').trim();

            res.season = season;

            if (res.amountOfGames > 0) {
                leagueStarted = true;
            }

            leageData.push(res);
        });

        if (!leagueStarted) {
            for (team of leageData) {
                if (team.teamName == "הפועל ירושלים") {
                    leageData[0].rank = team.rank;
                    team.rank = 1;
                }
            }
        }

        return leageData;
    }, SEASON);

    browser.close();
    return result;
};

app.get('/getLeagueTable', function (req, res) {
    scrapeLeagueTable(40).then((value) => {
    //scrapeLeagueTable(5981).then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getWomenLeagueTable', function (req, res) {
    scrapeLeagueTable(637).then((value) => {
    // scrapeLeagueTable(7196).then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getGamePlayersData/:gameId', function (req, res) {

    const gameId = req.params.gameId;

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: false
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        page.on('console', consoleObj => console.log(consoleObj.text()));   // Enables console prints in evaluate callback
        await page.goto(`https://football.org.il/leagues/games/game/?game_id=${gameId}`);

        const result = await page.evaluate((season, game_id) => {

            const numberPattern = /\d+/g;

            const getPlayerData = (player, index, playerStatus, isHome, gameId, season) => {
                const res = {};

                const playerLink = player.parentElement;
                const urlParams = playerLink.href.split("=");
                const playerId = urlParams[urlParams.length - 1];

                res._id = `${season}-${gameId}-${playerId}`;
                res.order = index;
                res.shirtNum = player.querySelector('.number').innerText.match(numberPattern)[0];
                res.playerState = playerStatus;
                res.gameId = gameId;
                res.playerId = playerId;
                res.isHome = isHome;
                res.name = player.querySelector('.name').innerText;
                res.season = season;
                res.yellowCard = getGameEventTime(player, '.yellow');
                res.yellow2Card = getGameEventTime(player, '.yellow2');
                res.redCard = getGameEventTime(player, '.red');
                res.changeDown = getGameEventTime(player, '.change-down');
                res.changeUp = getGameEventTime(player, '.change-up');
                res.goalsTime = getGoalsData(player);
                res.goalsSum = res.goalsTime && JSON.parse(res.goalsTime).length;

                return res;
            };

            const getGameEventTime = (player, eventSelector) => {
                const event = player.querySelector(eventSelector);
                if (event) {
                    const text = event.innerText.match(numberPattern)[0]
                    player.querySelector('.moves').removeChild(event)
                    return text
                }
                return null;
            };

            const getGoalsData = (player) => {
                let goals = []
                const moves = player.querySelector('.moves').innerText.split(" \n")
                moves.forEach((item, i) => {
                  if((item.includes('שער') && !item.includes('עצמי')) || item.includes('פנדל')){
                    const goalTime = item.match(numberPattern)
                    goals = goals.concat(goalTime)
                  }
                });
                if(goals.length > 0){
                  return JSON.stringify(goals);
                } else {
                    return null;
                }
            };

            const playersData = [];

            const activeHomePlayers = document.querySelectorAll('.home.Active .player');
            const activeAwayPlayers = document.querySelectorAll('.guest.Active .player');

            const benchHomePlayers = document.querySelectorAll('.home.Bench .player');
            const benchAwayPlayers = document.querySelectorAll('.guest.Bench .player');

            const replacementHomePlayers = document.querySelectorAll('.home.Replacement  .player');
            const replacementAwayPlayers = document.querySelectorAll('.guest.Replacement  .player');

            activeHomePlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'active', true, game_id, season));
            });
            activeAwayPlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'active', false, game_id, season));
            });

            replacementHomePlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'replacement', true, game_id, season));
            });

            replacementAwayPlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'replacement', false, game_id, season));
            });

            benchHomePlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'bench', true, game_id, season));
            });

            benchAwayPlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'bench', false, game_id, season));
            });

            return playersData;
        }, SEASON, gameId);

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getGameStaffData/:gameId', function (req, res) {

    const gameId = req.params.gameId;

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: false
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        page.on('console', consoleObj => console.log(consoleObj.text()));   // Enables console prints in evaluate callback
        await page.goto(`https://football.org.il/leagues/games/game/?game_id=${gameId}`);

        try {
            const result = await page.evaluate((season, game_id) => {

                const getJudgesPosition = (judge) => {
                    const position = judge.querySelector('.position').innerText;
                    switch (position) {
                        case 'שופט רביעי':
                            return 'judge4';
                        case 'עוזר שופט 2':
                            return 'judge2';
                        case 'עוזר שופט 1':
                            return 'judge1';
                        case 'שופט ראשי':
                            return 'mainJudge';
                        default:
                            return null;
                    }
                };

                const homeCoach = document.querySelector('#GAME_COACH_HOME').parentElement.querySelector('.player');
                const awayCoach = document.querySelector('#GAME_COACH_GUEST').parentElement.querySelector('.player');

                res = {
                    _id: `${season}-${game_id}`,
                    gameId: game_id,
                    season: season,
                    homeCoach: homeCoach.querySelector('.name').innerText,
                    awayCoach: awayCoach.querySelector('.name').innerText,
                };

                const judges = document.querySelector('.judge').querySelectorAll('.player');
                judges.forEach(judge => {
                    const name = judge.querySelector('.name').innerText;
                    const position = getJudgesPosition(judge);
                    if (position) {
                        res[position] = name;
                    }
                });

                return res;
            }, SEASON, gameId);

            browser.close();
            return result;
        } catch(e) {
            console.error("Exception in getGameStaffData", e);
        }
    };

    try {
        scrape().then((value) => {
            res.send(JSON.stringify(value));
    });
    } catch(e) {
        console.error("Exception in getGameStaffData", e);
    }
});

const scrapeTeams = async (leagueId) => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: false
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    page.on('console', consoleObj => console.log(consoleObj.text()));   // Enables console prints in evaluate callback
    await page.goto(`https://football.org.il/leagues/league/?league_id=${leagueId}&season_id=${SEASON_ID}`);

      await page.addScriptTag({path: "functions.js"});

    const teams = await page.evaluate((season) => {
        const data = [];
        const teams = document.querySelectorAll('.playoff-container > .table_row')

        teams.forEach((team, index) => {
            data.push(getTeamsData(team, index, season));
        });
        return data;
    }, SEASON);

    await Promise.all([
          page.waitForNavigation(),
          page.goto(`https://football.org.il/en/leagues/league/?league_id=${leagueId}&season_id=${SEASON_ID}`)
    ]);

    await page.addScriptTag({path: "functions.js"});

    const teamsEnglish = await page.evaluate((season) => {
        const data = [];
        const teams = document.querySelectorAll('.playoff-container > .table_row')

        teams.forEach((team, index) => {
            data.push(getTeamsData(team, index, season));
        });
        return data;
    }, SEASON);

    teams.forEach((team, i) => {
      team.teamNameEn =  teamsEnglish[i].teamName
    });

    browser.close();
    return teams;
};

app.get('/getTeams', function (req, res) {
    scrapeTeams(40).then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getWomenTeams', function (req, res) {
    scrapeTeams(637).then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getImages/:season/:folderName/:credit', async (req, res) => {

    const {season, folderName, credit} = req.params;
    const path = `${season}/${folderName}`;

    const files = await getFileListFromAWS(path);

    let images = [];
    files.forEach((file) => {
        images.push({
            imageUrl: S3_PUBLIC_PATH + "/" + file,
            season,
            folderName,
            credit
        });
    });

    console.log("Updating website with " + images.length + " images");

    // images.forEach((img, idx) => {
    //     console.log("Image", idx, ":");
    //     console.log(JSON.stringify(img));
    // });
    await insertImageToDB(images, season);

    res.send("Inserted " + images.length + " images to DB");
});

const getFileListFromAWS = async (path) => {
    const params = {
        Bucket: S3_UPLOADS_BUCKET,
        Prefix: path,
    };

    console.log("Getting file list for path: ", path);

    return new Promise((resolve, reject) => {
        s3.listObjects(params, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                reject(err);
            }
            else {  // successful response
                console.log("File list received. number of images: ", data.Contents.length);

                resolve(data.Contents.map((obj) => {
                    return obj.Key;
                }));
            }
        });
    });
}

const insertImageToDB = async (images, season) => {
    const request = require("request");

    const options = {
        method: 'POST',
        url: `${SITE_URL}_functions/updateImage`,
        headers:
        {
            'cache-control': 'no-cache',
            'content-type': 'application/json'
        },
        body: {
            images,
            season
        },
        json: true
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) {
                console.log('Error while inserting images to db', error);
                reject(error);
            } else {
                console.log('Images inserted to DB successfully');
                resolve();
            }
        });
    });
}

app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT || 5000, '...');
