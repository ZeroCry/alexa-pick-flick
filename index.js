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
  'utterances': ['{find|pick|get} {movies|shows|a movie|show} directed by {names|Director}']
},
  function getMoviesByDirector(req, res) {
    const director = req.slot('Director');
    console.log(`request received ${director}`)
      let cardTitle = `Movies by ${director}`;
      if (director) {
          let options = Object.assign({}, apiRequestOptions);
          let movieData = ``;
          options.path += `?director=`+director.replace(/ /g,'%20');
          //load api response
          https.request(options, (response) => {
            response.setEncoding('utf8')
            .on('data', (chunk) => {
              movieData += chunk;
            })
            .on('end', () => {
              if(response.statusCode === 200){
                  movieData = JSON.parse(movieData);
                  let bestMovie = selectBestMovie(movieData);
                  cardTitle = bestMovie.show_title;

                  res
                    .say(`I recommend ${bestMovie.show_title} from ${bestMovie.release_year}, which has a rating of ${bestMovie.rating} stars.`)
                    .reprompt(`Would you like to hear the movie summary? Or you can say Stop if you are done.`)
                    .shouldEndSession(false)
                    .send();

              }else{
                res.say( `I was unable to find any movies directed by ${director}.`)
                .reprompt(`Would you like to try another search? Or you can say Stop if you are done.`)
                .shouldEndSession(false)
                .send();
              }
            });
          })
          .on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
            res.say(`Sorry, There was a problem retrieving your results. Please try again.`)
              .reprompt(`What type of movie would you like to watch`)
              .shouldEndSession(false)
              .send();
          })
          .end();
          return false;
      } else {
          let prompt =  `I'm not sure what director you are looking for. Please try again.`;
          res.say(prompt).reprompt(prompt).shouldEndSession(false).send();
          return true;
      }
  }
);


function selectBestMovie(movieList) {
  return movieList[0];
}

module.exports = app;
module.change_code=1
exports.handler = app.lambda();
