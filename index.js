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
  const type = req.data.request.intent.name;

    let reprompt = `I'm not sure what director or actor you are looking for. Please try again.`;
    let options = Object.assign({}, apiRequestOptions);
    let movieData = ``;
    if (type == 'MovieByDirector') {
      const director = req.slot('Director');
        options.path += `?director=${director.replace(/ /g,'%20')}`;
        //load api response
        executeAPIRequest(options, (err, movieData) => {
          if(err){
            res.say( `I was unable to find any movies directed by ${director}. Please request another director, or say Stop if you are done.`)
            .reprompt(`Would you like to try another search? Or you can say Stop if you are done.`)
            .shouldEndSession(false)
            .send();
          }else{
            let bestMovie = selectBestMovie(movieData);
            res
              .say(`I recommend ${bestMovie.show_title} from ${bestMovie.release_year}, which has a rating of ${bestMovie.rating} stars.`)
              .reprompt(`Would you like to hear the movie summary? Or you can say Stop if you are done.`)
              .shouldEndSession(false)
              .send();
          }
        })
        return false;
    } else if(type == 'MovieByActor'){
      const actor = req.slot('Actor');
      options.path += `?actor=${actor.replace(/ /g,'%20')}`;
      //load api response
      executeAPIRequest(options, (err, movieData) => {
        if(err){
          res.say( `I was unable to find any movies starring by ${actor}. Please request another actor, or say Stop if you are done.`)
          .reprompt(`Would you like to try another search? Or you can say Stop if you are done.`)
          .shouldEndSession(false)
          .send();
        }else{
          let bestMovie = selectBestMovie(movieData);
          res
            .say(`I recommend ${bestMovie.show_title} from ${bestMovie.release_year}, which has a rating of ${bestMovie.rating} stars.`)
            .reprompt(`Would you like to hear the movie summary? Or you can say Stop if you are done.`)
            .shouldEndSession(false)
            .send();
        }
      })
      return false;
    }else{
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
  return movieList[0];
}

module.exports = app;
module.change_code=1
exports.handler = app.lambda();
