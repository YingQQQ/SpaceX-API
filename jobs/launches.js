const _ = require('lodash');
const got = require('got');
const { logger } = require('../middleware/logger');

const API = process.env.SPACEX_API;
const KEY = process.env.SPACEX_KEY;
const HEALTHCHECK = process.env.LAUNCHES_HEALTHCHECK;

/**
 * Update launch arrays
 * @return {Promise<void>}
 */
module.exports = async () => {
  try {
    const launches = await got.post(`${API}/launches/query`, {
      json: {
        query: {
          upcoming: false,
        },
        options: {
          sort: {
            flight_number: 'asc',
          },
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const results = {
      capsule: false,
      core: false,
      crew: false,
      landpad: false,
      launchpad: false,
      payload: false,
      ship: false,
    };

    // Update capsule launches
    const capsules = await got.post(`${API}/capsules/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const capsuleLaunches = capsules.docs.map(async (capsule) => {
      const launchIds = launches.docs
        .filter((launch) => launch.capsules.includes(capsule.id))
        .map(({ id }) => id);

      await got.patch(`${API}/capsules/${capsule.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.capsule = true;
    });
    await Promise.all(capsuleLaunches);

    // Update core launches
    const cores = await got.post(`${API}/cores/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const coreLaunches = cores.docs.map(async (core) => {
      const launchIds = launches.docs
        .filter((launch) => launch.cores.find((c) => c.core === core.id))
        .map(({ id }) => id);

      await got.patch(`${API}/cores/${core.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.core = true;
    });
    await Promise.all(coreLaunches);

    // Update crew launches
    const crewMembers = await got.post(`${API}/crew/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const crewLaunches = crewMembers.docs.map(async (crew) => {
      const launchIds = launches.docs
        .filter((launch) => launch.crew.includes(crew.id))
        .map(({ id }) => id);

      await got.patch(`${API}/crew/${crew.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.crew = true;
    });
    await Promise.all(crewLaunches);

    // Update landpad launches
    const landpads = await got.post(`${API}/landpads/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const landpadLaunches = landpads.docs.map(async (landpad) => {
      const launchIds = launches.docs
        .filter((launch) => launch.cores.find((c) => c.landpad === landpad.id))
        .map(({ id }) => id);

      await got.patch(`${API}/landpads/${landpad.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.landpad = true;
    });
    await Promise.all(landpadLaunches);

    // Update launchpad launches
    const launchpads = await got.post(`${API}/launchpads/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const launchpadLaunches = launchpads.docs.map(async (launchpad) => {
      const launchIds = launches.docs
        .filter((launch) => launch.launchpad === launchpad.id)
        .map(({ id }) => id);

      await got.patch(`${API}/launchpads/${launchpad.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.launchpad = true;
    });
    await Promise.all(launchpadLaunches);

    // Update payload launches
    const payloads = await got.post(`${API}/payloads/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const payloadLaunches = payloads.docs.map(async (payload) => {
      const launchId = _.find(launches.docs, (launch) => launch.payloads.includes(payload.id));
      if (launchId?.id) {
        await got.patch(`${API}/payloads/${payload.id}`, {
          json: {
            launch: launchId.id,
          },
          headers: {
            'spacex-key': KEY,
          },
        });
        results.payload = true;
      }
    });
    await Promise.all(payloadLaunches);

    // Update ship launches
    const ships = await got.post(`${API}/ships/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const shipLaunches = ships.docs.map(async (ship) => {
      const launchIds = launches.docs
        .filter((launch) => launch.ships.includes(ship.id))
        .map(({ id }) => id);

      await got.patch(`${API}/ships/${ship.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.ship = true;
    });
    await Promise.all(shipLaunches);

    // Update fairing launches
    const fairings = await got.post(`${API}/fairings/query`, {
      json: {
        options: {
          pagination: false,
        },
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });

    const fairingLaunches = fairings.docs.map(async (fairing) => {
      const launchIds = launches.docs
        .filter((launch) => {
          if (launch.fairings && launch.fairings.length) {
            return launch.fairings.find((f) => f.fairing === fairing.id);
          }
          return false;
        })
        .map(({ id }) => id);

      await got.patch(`${API}/fairings/${fairing.id}`, {
        json: {
          launches: launchIds,
        },
        headers: {
          'spacex-key': KEY,
        },
      });
      results.fairing = true;
    });
    await Promise.all(fairingLaunches);

    logger.info(results);

    if (HEALTHCHECK) {
      await got(HEALTHCHECK);
    }
  } catch (error) {
    console.log(`Launches Error: ${error.message}`);
  }
};
