import React, { PureComponent } from 'react';
import { connect } from 'react-redux';

import TreeView from '../TreeView';
import Viewer from '../Viewer';
import InfoView from '../InfoView';
import ActivityCreator from '../ActivityCreator';
import ObjectInfo from '../ObjectInfo';

import './style.styl';

class IndexView extends PureComponent {
    render() {
        return <div className='v-index clearbox'>
            <div className='left-sidebar'>
                <div className='treeview-container'>
                    <TreeView />
                </div>
                <div className='objectinfo-container'>
                    <ObjectInfo />
                </div>
            </div>
            <Viewer className='main' />
            <div className='right-sidebar'>
                {this.props.creatingActivity &&
                    <ActivityCreator />}
                <InfoView />
            </div>
        </div>;
    }
}

const mapStateToProps = (state, ownProps) => {
    return {
        creatingActivity: state.creatingActivity
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        dispatch
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(IndexView);
