import React from 'react';
import { connect } from 'react-redux';
import _ from 'underscore';

import BasePane from '../BasePane';
import { TOGGLE_ACTIVITY, SELECT_ACTIVITY, SELECT_TRACK, TOGGLE_TRACK } from '../../actions/types';

import './style.styl';

class ActivityPanel extends BasePane {
    constructor(props) {
        super(props);
    }
    getContainer() {
        return this.props.annotationActivityContainer;
    }

    getItemId(item) {
        return item.id2;
    }

    toggleItem(item, enabled) {
        this.props.dispatch({
            type: TOGGLE_ACTIVITY,
            payload: { activity: item, enabled }
        });
    }

    render() {
        if (!this.props.annotationActivityContainer || !this.props.annotationTypeContainer) {
            return null;
        }
        var activityContainer = this.props.annotationActivityContainer;
        var activities = activityContainer.getAllItems();
        var geometryContainer = this.props.annotationGeometryContainer;
        var typeContainer = this.props.annotationTypeContainer;

        return <div className={['v-activity-pane', this.props.className].join(' ')}>
            <div className='checkbox'>
                <label>
                    <input type='checkbox' checked={this.allChecked()} onChange={(e) => this.allClick()} />
                    All
                </label>
            </div>
            <ul>
                {activities.map((activity) => {
                    return <li key={activity.id2}>
                        <div className={'checkbox ' + (activity.id2 === this.props.selectedActivityId ? 'selected' : '')}>
                            <label onClick={(e) => { if (e.target.type !== 'checkbox') { e.preventDefault(); } }}>
                                <input type='checkbox'
                                    checked={activityContainer.getEnableState(activity.id2)}
                                    onChange={(e) => this.props.dispatch({
                                        type: TOGGLE_ACTIVITY,
                                        payload: { activity, enabled: e.target.checked }
                                    })}
                                />
                                <span onClick={(e) => {
                                    this.props.dispatch({
                                        type: SELECT_ACTIVITY,
                                        payload: this.props.selectedActivityId === activity.id2 ? null : activity.id2
                                    });
                                }}>{activity.act2}-{activity.id2}</span>
                            </label>
                        </div>
                        <ul>
                            {activity.actors.map((actor) => {
                                var type = typeContainer.getItem(actor.id1);
                                var label = (type && type.obj_type) ? `${type.obj_type}-${actor.id1}` : actor.id1;
                                return <li key={actor.id1}>
                                    <div className={'checkbox ' + (actor.id1 === this.props.selectedTrackId ? 'selected' : '')}>
                                        <label onClick={(e) => { if (e.target.type !== 'checkbox') { e.preventDefault(); } }}>
                                            <input type='checkbox'
                                                checked={geometryContainer.getEnableState(actor.id1)}
                                                onChange={(e) => this.props.dispatch({
                                                    type: TOGGLE_TRACK,
                                                    payload: { track: actor.id1, enabled: e.target.checked }
                                                })}
                                            />
                                            <span onClick={(e) => {
                                                this.props.dispatch({
                                                    type: SELECT_TRACK,
                                                    payload: actor.id1 === this.props.selectedTrackId ? null : actor.id1
                                                });
                                            }}>{label}</span>
                                        </label>
                                    </div>
                                </li>
                            })}
                        </ul>
                    </li>;
                })}
            </ul>
        </div>;
    }
}

const mapStateToProps = (state, ownProps) => {
    return {
        annotationGeometryContainer: state.annotationGeometryContainer,
        annotationActivityContainer: state.annotationActivityContainer,
        annotationTypeContainer: state.annotationTypeContainer,
        selectedActivityId: state.selectedActivityId,
        selectedTrackId: state.selectedTrackId
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        dispatch
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ActivityPanel);
