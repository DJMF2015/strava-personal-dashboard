import React, { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';
import { getAthleteActivities } from '../utils/functions';
import { catchErrors } from '../utils/helpers';
import { formattedDate } from '../utils/conversion';
import Login from './Login';
import styled from 'styled-components';
import SearchBar from '../utils/search';
import Layers from '../components/layers';
import { useGetWindowWidth } from '../utils/hooks';
import LoadingWheel from '../styles/Loading.module.css';
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  LayersControl,
  Polyline,
  Popup,
} from 'react-leaflet';

const ActivitiesMap = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTxt, setSearchTxt] = useState('');
  const { windowWidth } = useGetWindowWidth();
  const [activityLoadingState, setActivityLoadingState] = useState(null);
  const expires_in = localStorage.getItem('expires_in');
  let access_token = JSON.parse(localStorage.getItem('access_token'));

  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      let polylines = [];
      let stravaActivityResponse;
      let looper_num = 1;

      setLoading(true);
      while (looper_num < 2) {
        let stravaActivityResponse_single = await getAthleteActivities(
          access_token,
          200,
          looper_num
        ); //|| stravaActivityResponse.length === 0
        if (
          !stravaActivityResponse_single.data ||
          stravaActivityResponse_single.data.length === 0 ||
          stravaActivityResponse_single.data.errors
        ) {
          setLoading(false);
          break;
        } else if (stravaActivityResponse) {
          setActivityLoadingState(stravaActivityResponse.length);
          stravaActivityResponse = stravaActivityResponse.concat(
            stravaActivityResponse_single.data
          );
        } else {
          stravaActivityResponse = stravaActivityResponse_single.data;
        }

        looper_num++;
      }

      for (let i = 0; i < stravaActivityResponse.length; i += 1) {
        const activity_polyline = stravaActivityResponse[i].map.summary_polyline;
        const activityDate = formattedDate(stravaActivityResponse[i].start_date_local);
        const activityName = stravaActivityResponse[i].name;
        const activityType = stravaActivityResponse[i].type;
        const activityId = stravaActivityResponse[i].id;
        polylines.push({
          activityPositions: polyline.decode(activity_polyline),
          activityName: activityName,
          activityDate: activityDate,
          activityType: activityType,
          activityId: activityId,
        });
      }
      setLoading(false);

      setNodes(polylines);
    }
    catchErrors(fetchData());
    // eslint-disable-next-line
  }, []);

  const filteredName = nodes.filter((activity) => {
    return activity.activityName.toLowerCase().includes(searchTxt.toLowerCase());
  });

  if (loading && access_token) {
    return (
      <div>
        <h1 style={{ color: 'red', textAlign: 'center' }}>
          <div className={LoadingWheel.loading} style={{ color: 'darkorange' }}>
            ...
          </div>
          Wait. Loading {activityLoadingState} activities......
        </h1>
      </div>
    );
  }

  return (
    <>
      {!access_token || expires_in === '0' ? (
        <Login />
      ) : (
        <>
          <SideNavigation>
            <input
              className="search__input"
              type="text"
              placeholder="Search by activity name..."
              aria-label="Search"
              onChange={(e) => setSearchTxt(e.target.value)}
            />

            {filteredName &&
              filteredName.map((activity, i) => (
                <a
                  href={`https://www.strava.com/activities/${activity.activityId}`}
                  target="_blank"
                  rel="noreferrer"
                  key={i}
                >
                  {activity.activityDate + ' '}
                  {activity.activityName + ' '}
                  {activity.activityType + ' '}
                </a>
              ))}
          </SideNavigation>
          {windowWidth < 785 && (
            <SearchBar
              searchTxt={searchTxt}
              updateSearchTxt={setSearchTxt}
              width={'75%'}
              fontSize="1rem"
              placeholder="Search by activity name..."
            />
          )}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '600px',
            }}
          >
            <MapContainer
              style={{ height: '100vh', width: '100vw', zIndex: 0 }}
              center={[55.89107, -3.21698]}
              zoom={7}
              zoomControl={false}
              bounds={nodes.map((node) => node.activityPositions)} //
              boundsOptions={{ padding: [50, 50] }}
              maxBoundsViscosity={0}
              scrollWheelZoom={true}
            >
              <LayersControl position="topright" collapsed={false}>
                {Layers.map((layer, index) => {
                  return (
                    <LayersControl.BaseLayer
                      key={index}
                      checked={index === 0 ? true : false}
                      name={layer.name}
                    >
                      <TileLayer attribution={layer.attribution} url={layer.url} />
                    </LayersControl.BaseLayer>
                  );
                })}
                {filteredName &&
                  filteredName.map((activity, i) => (
                    <div>
                      <FeatureGroup>
                        <Polyline
                          positions={activity.activityPositions}
                          key={i}
                          weight={3}
                          color="red"
                          smoothFactor={0.7}
                          vectorEffect="non-scaling-stroke"
                          opacity={0.5}
                          zoom={12}
                        />
                        <Popup>
                          {activity.activityName + ' ' + activity.activityDate}{' '}
                          <a
                            href={`https://www.strava.com/activities/${activity.activityId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on Strava
                          </a>
                        </Popup>
                      </FeatureGroup>
                    </div>
                  ))}
              </LayersControl>
            </MapContainer>
          </div>
        </>
      )}
    </>
  );
};
export default ActivitiesMap;

const SideNavigation = styled.div`
  height: 100%;
  margin-top: 40px;
  width: 230px;
  display: block;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  scroll-behavior: smooth;
  overflow-y: scroll;
  padding-top: 20px;
  background-color: #111;
  opacity: 0.8;
  color: white;

  @media screen and (max-width: 785px) {
    display: none;
  }

  .search__input {
    width: 90%;
    height: 20px;
    font-size: 1rem;
    display: inline-block;
    margin: 0px 0px 0px 5px;
    margin-bottom: 0.5em;
    border-radius: 0.5em;
    margin-top: 10px;
    border: 1px solid white;
    padding: 5px;
    outline: none;
  }

  .search__input:focus {
    border: 1px solid red;
  }
  .search__input::placeholder {
    color: gray;
    align-items: center;
  }

  .screenshot__button {
    margin-left: 1.5vw;
    margin-top: 3px;
    margin-bottom: 10px;
    color: red;
    font-size: 0.9rem;
    font-weight: bold;
    background-color: ghostwhite;
    border: 2px solid white;
    border-radius: 10px;
    width: 175px;
    height: 30px;
  }

  .screenshot__button:hover {
    background-color: red;
    color: white;
    border: 2px solid red;
  }
  /* customise scrollbar for modern browser except firefox*/
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px grey;
    border-radius: 10px;
  }
  ::-webkit-scollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:window-inactive {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:horizontal {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:vertical {
    background-color: #555;
  }

  a {
    padding: 5px 3px 3px 20px;
    line-break: 2px;
    margin-top: 2px;
    text-decoration: none;
    font-size: 12px;
    color: white;
    display: block;
  }

  a:hover {
    color: white;
    text-decoration: underline;
  }

  /* @media screen and (max-width: 750px) {
    width: 150px;
    display: block;
    font-size: 10px;
    a {
      font-size: 12px;
      color: white;
    }
    .search__input {
      width: 75%;
      height: 20px;
      font-size: 0.8rem;
      display: inline-block;
      margin: 90px 5px 20px 10px;
      margin-bottom: 0px;
      margin-top: 40px;
      border-radius: 5px;
      border: 1px solid #ccc;
      padding: 5px;
      outline: none;
    }

    .screenshot__button {
      margin-left: 1.25vw;
      margin-top: 15px;
      margin-bottom: 10px;
      width: 190px;
      color: red;
      font-size: 0.7rem;
      font-weight: bold;
      background-color: ghostwhite;
      border: 2px solid white;
      border-radius: 10px;
      width: 120px;
      height: 30px;
    }
  } */

  /* @media screen and (max-width: 450px) {
 
    display: none;
    font-size: 10px;
    a {
      font-size: 12px;
      color: white;
    }
    .search__input {
      width: 75%;
      height: 20px;
      font-size: 0.8rem;
      display: inline-block;
      margin: 40px 5px 20px 10px;
      margin-bottom: 0px;
      margin-top: 100px;
      border-radius: 5px;
      border: 1px solid #ccc;
      padding: 5px;
      outline: none;

      .screenshot__button {
        margin-left: 1.25vw;
        margin-top: 19px;
        margin-bottom: 10px;
        width: 190px;
        color: red;
        font-size: 0.7rem;
        font-weight: bold;
        background-color: ghostwhite;
        border: 2px solid white;
        border-radius: 10px;
        width: 120px;
        height: 30px;
      }
      .screenshot__button:hover {
        background-color: red;
        color: white;
        border: 2px solid red;
      }
    } */
  /* } */
`;
