import _ from 'underscore';
import { restRequest } from 'girder/rest';

import { IMPORT_PROGRESS_CHANGE, LOAD_ANNOTATION, GOTO_FRAME, LIMIT_FRAME } from '../actions/types';
import annotationDetectionParser, { AnnotationDetectionContainer } from '../util/annotationDetectionParser';
import annotationActivityParser, { AnnotationActivityContainer } from '../util/annotationActivityParser';
import annotationTypeParser, { AnnotationTypeContainer } from '../util/annotationTypeParser';

export default (folderId, activityGroupItemId) => {
    return (dispatch, getState) => {
        dispatch({
            type: `${LOAD_ANNOTATION}_PENDING`
        });
        return restRequest({
            method: 'GET',
            url: `/item/${activityGroupItemId}/download`,
            contentType: 'application/json'
        }).then((activityGroup) => {
            // - { types: {cset3: {Sitting Down: 1}, id1: 17} }
            // - { act: { act2: {activity_standing: 1.0}, id2: 13, timespan: [{tsr0: [558, 688]}], src: truth, actors: [ {id1: 15 , timespan: [{tsr0: [558, 688 ]}]}] } }
            // - { detection: { src: truth, g0: 325 672 471 370, id0: 32, id1: 11, ts0: 1827, ts1: 0 } }


            // {
            //     "type": "Sitting Down",
            //     "detections": [
            //       {
            //         "g0": "160 716 382 396",
            //         "src": "truth",
            //         "ts0": 1845
            //       },
            //       {
            //         "g0": "192 706 392 451",
            //         "src": "truth",
            //         "ts0": 1935
            //       }
            //     ],
            //     "tracks": [
            //       {
            //         "type": "Person",
            //         "detections": [
            //           {
            //             "g0": "233 684 346 489",
            //             "src": "truth",
            //             "ts0": 1935
            //           },
            //           {
            //             "g0": "185 691 285 424",
            //             "src": "truth",
            //             "ts0": 1845
            //           }
            //         ]
            //       }
            //     ]
            //   }
            var types = [];
            var detections = [];
            var activity = null;
            var actors = [];
            for (let track of activityGroup.tracks) {
                var type = {
                    id1: types.length + 1,
                    cset3: { [track.type]: 1 }
                };
                types.push(type);
                for (let detection of track.detections) {
                    var splits = detection.g0.split(' ');
                    detections.push({
                        id0: detections.length + 1,
                        id1: type.id1,
                        src: detection.src,
                        g0: [[parseInt(splits[0]), parseInt(splits[1])], [parseInt(splits[2]), parseInt(splits[3])]],
                        ts0: detection.ts0,
                        ts1: 0
                    })
                }
                let trackFrames = track.detections.map((detection) => detection.ts0);
                actors.push({
                    id1: type.id1,
                    timespan: [{ tsr0: [_.min(trackFrames), _.max(trackFrames)] }]
                })
            }
            let activityFrames = activityGroup.detections.map((detection) => detection.ts0);
            let activityTimespan = [_.min(activityFrames), _.max(activityFrames)];
            activity = {
                id2: 1,
                act2: { [activityGroup.type]: 1.0 },
                src: 'truth',
                timespan: [{ tsr0: activityTimespan }],
                actors
            };
            console.log(activity);
            var annotationActivityContainer = annotationActivityParser(folderId, [activity]);
            var annotationTypeContainer = annotationTypeParser(folderId, types);
            var annotationDetectionContainer = annotationDetectionParser(folderId, detections);
            dispatch({
                type: LOAD_ANNOTATION + '_FULFILLED',
                payload: { annotationActivityContainer, annotationTypeContainer, annotationDetectionContainer }
            });
            dispatch({
                type: GOTO_FRAME,
                payload: activityTimespan[0]
            });
            dispatch({
                type: LIMIT_FRAME,
                payload: [Math.max(activityTimespan[0] - 30), activityTimespan[1] + 30]
            });
        });
    };
};