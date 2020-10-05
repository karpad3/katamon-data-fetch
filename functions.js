
const getGameData = (game, index, gameType, season) => {
  const res = {}

  const urlp = game.href.split("=")
  const gameId = urlp[urlp.length - 1];

  res._id = gameType === 'league' ? `${season}-${index}` : `${season}-${gameType}-${index}`;
  res.number = index + 1;
  res.gameId = gameId.trim();
  res.season = season;
  res.gameType = gameType

  const dateSR = game.childNodes[1].children[0].innerText;
  res.date = game.childNodes[1].innerText.replace(dateSR, '').trim();

  const homeTeamSR = game.childNodes[3].children[0].innerText;
  const teams = game.childNodes[3].innerText.replace(homeTeamSR, '');

  res.homeTeam = teams.replace('י-ם', 'ירושלים').split('-')[0].replace(/\r?\n?\t|\r/g, '').trim();
  res.awayTeam = teams.replace('י-ם', 'ירושלים').split('-')[1].replace(/\r?\n?\t|\r/g, '').trim();

  const locationSR = game.childNodes[5].children[0].innerText;
  res.location = game.childNodes[5].innerText.replace(locationSR, '').trim();

  const timeSR = game.childNodes[7].children[0].innerText;
  const time = game.childNodes[7].innerText.replace(timeSR, '');
  res.time = time === '00:00' ? '' : time.trim();

  const scoreSR = game.childNodes[9].children[0].innerText;
  const score = game.childNodes[9].innerText.replace(scoreSR, '');

  res.score = score === 'טרם נקבעה' ? '' : score.trim();
  res.finished = score !== 'טרם נקבעה';

  return res;
}
