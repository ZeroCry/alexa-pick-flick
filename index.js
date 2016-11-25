'use strict'
const Alexa = require('alexa-app');
const app = new Alexa.app('pick-flick');
const https = require('https');
const apiRequestOptions = {
  hostname: 'netflixroulette.net',
  port: 443,
  path: '/api/api.php',
  method: 'GET'
};

app.launch(function(req, res) {
  var prompt = 'For movie information, ask for a recomendation by director or actor.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

app.error = function(exception, request, response) {
    response.say("Sorry, I was unable to handle that request. Please try again");
};

app.intent('MovieByDirector', {
  'slots': {
    'Director': 'AMAZON.LITERAL'
  },
  'utterances': ['{find|pick|get|recommend} {movies|shows|a movie|show} directed by {onename|two name|three word name|Director}']
},
  getMoviesByDirectorOrActor
);

app.intent('MovieByActor', {
  'slots': {
    'Actor': 'AMAZON.LITERAL'
  },
  'utterances': ['{find|pick|get|recommend} {movies|shows|a movie|show} {starring|with|featuring} {onename|two name|three word name|Actor}']
},
  getMoviesByDirectorOrActor
);

function getMoviesByDirectorOrActor(req, res) {
try{
  const type = (req.data.request.intent.name == 'MovieByDirector' ? 'Director':'Actor');
  const search = req.slot(type);
  const query = `?${type.toLowerCase()}=${search.replace(/ /g,'%20')}`;
    let reprompt = `Sorry, I'm not sure what ${type} you are looking for. Please try again.`;
    let options = Object.assign({}, apiRequestOptions);
    options.path += query;
    //load api response
    executeAPIRequest(options, (err, movieData) => {
      if(err || !movieData || !movieData.length){
        res.say( `I was unable to find any movies ${type == 'Director'? 'directed by':'starring'} ${search}.
        Please request another ${type}, or say Stop if you are done.`)
        .reprompt(`Would you like to try another search? Or you can say Stop if you are done.`)
        .shouldEndSession(false)
        .send();
      }else{
        let bestMovie = selectBestMovie(movieData);
        res
          .say(`I recommend ${bestMovie.show_title} from ${bestMovie.release_year}, which has a rating of ${bestMovie.rating} stars.
            A full description is shown in your Alexa app.`)
          .card({
              type: "Standard",
              title: bestMovie.show_title,
              text:  bestMovie.summary,
              image: {
                smallImageUrl: bestMovie.poster.replace('http:','https:')
              }
            })
          .reprompt(`You can make another request or you can say Stop if you are done.`)
          .shouldEndSession(false)
          .send();
      }
    });
      return false;
    }catch(e){
        res.say(reprompt).reprompt(reprompt).shouldEndSession(false).send();
        return true;
    }
}

function executeAPIRequest(options, callback){
  let movieData = ``;
  https.request(options, (response) => {
    response.setEncoding('utf8')
    .on('data', (chunk) => {
      movieData += chunk;
    })
    .on('end', () => {
      if(response.statusCode === 200){
          movieData = JSON.parse(movieData);
          callback(null, movieData);
      }else{
        callback(response);
      }
    });
  })
  .on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
    callback(e);
  })
  .end();
}

function selectBestMovie(movieList) {
  return movieList && movieList[0];
}

module.exports = app;
module.change_code=1
exports.handler = app.lambda();
