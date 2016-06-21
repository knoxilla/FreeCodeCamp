import { Observable } from 'rx';
import { challengeSelector } from './selectors';
import {
  fetchChallenge,
  fetchChallenges,
  replaceChallenge
} from './types';
import {
  delayedRedirect,
  createErrorObserable
} from '../../../redux/actions';
import {
  fetchChallengeCompleted,
  fetchChallengesCompleted,
  updateCurrentChallenge
} from './actions';

function createNameIdMap(entities) {
  const { challenge } = entities;
  return {
    ...entities,
    challengeIdToName: Object.keys(challenge)
      .reduce((map, challengeName) => {
        map[challenge[challengeName].id] = challenge[challengeName].dashedName;
        return map;
      }, {})
  };
}

export default function fetchChallengesSaga(action$, getState, { services }) {
  return action$
    .filter(({ type }) => (
      type === fetchChallenges ||
      type === fetchChallenge ||
      type === replaceChallenge
    ))
    .flatMap(({ type, payload: { dashedName, block } = {} }) => {
      const state = getState();
      const lang = state.app.languageTag;
      if (type === replaceChallenge) {
        const { challenge: newChallenge } = challengeSelector({
          ...state,
          challengesApp: {
            ...state.challengesApp,
            challenge: dashedName
          }
        });
        if (state.challengesApp.challenge !== newChallenge.dashedName) {
          return Observable.just(updateCurrentChallenge(newChallenge));
        }
        return Observable.just(null);
      }
      const options = { service: 'map' };
      options.params = { lang };
      if (type === fetchChallenge) {
        options.params.dashedName = dashedName;
        options.params.block = block;
      }
      return services.readService$(options)
        .flatMap(({ entities, result, redirect } = {}) => {
          if (type === fetchChallenge) {
            return Observable.of(
              fetchChallengeCompleted(
                createNameIdMap(entities),
                result
              ),
              updateCurrentChallenge(entities.challenge[result.challenge]),
              redirect ? delayedRedirect(redirect) : null
            );
          }
          return Observable.just(
            fetchChallengesCompleted(
              createNameIdMap(entities),
              result
            )
          );
        })
        .catch(createErrorObserable);
    });
}