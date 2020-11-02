
const getGameData = (game, index, gameType, season, isEnglish) => {
  const res = {}

  const urlp = game.href.split("=")
  const gameId = urlp[urlp.length - 1];

  res._id = gameType === 'league' ? `${season}-${index}` : `${season}-${gameType}-${index}`;
  res.number = index + 1;
  res.gameId = gameId.trim();
  res.season = season;
  res.gameType = gameType

  const dateSR = game.childNodes[1].children[0].innerText;
  const date = game.childNodes[1].innerText.replace(dateSR, '').trim();
  res.date = date
  if(isEnglish){
    // format english date
    let [m,d,y] = date.split('/')
    d = d.length === 1 ? 0+d : d // pad Zero
    m = m.length === 1 ? 0+m : m // pad Zero
    res.date = [d,m,y].join('/')
  }

  const homeTeamSR = game.childNodes[3].children[0].innerText;
  const teams = game.childNodes[3].innerText.replace(homeTeamSR, '');

  const homeTeam = teams.replace('י-ם', 'ירושלים').split('-')[0].replace(/\r?\n?\t|\r/g, '').trim();
  const awayTeam = teams.replace('י-ם', 'ירושלים').split('-')[1].replace(/\r?\n?\t|\r/g, '').trim();

  res.homeTeam = homeTeam.replace(/[.]/g, '')
  res.awayTeam = awayTeam.replace(/[.]/g, '')

  const locationSR = game.childNodes[5].children[0].innerText;
  res.location = game.childNodes[5].innerText.replace(locationSR, '').trim();

  const timeSR = game.childNodes[7].children[0].innerText;
  const time = game.childNodes[7].innerText.replace(timeSR, '');
  res.time = time === '00:00' ? '' : time.trim();

  const scoreSR = game.childNodes[9].children[0].innerText;
  const score = game.childNodes[9].innerText.replace(scoreSR, '');

  res.score = score === 'טרם נקבעה' ? '' : score.trim();
  res.finished = gameId !== "-1";

  return res;
}


const getTeamsData = (team, index, season) => {
  const res = {};

  res._id = `${season}-${index + 1}`;

  const teamIdIndex =  team.href && team.href.search('team_id')
  const teamIdHref = teamIdIndex > 0 && team.href.slice(teamIdIndex)

  res.teamId = teamIdHref && teamIdHref.split("=")[1]

  const teamNameSR = team.childNodes[1].children[0].innerText;
  res.teamName = team.childNodes[1].innerText.replace(teamNameSR, '').replace('י-ם', 'ירושלים').trim();

  res.season = season;
  return res
}
