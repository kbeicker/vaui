import React from 'react';
import App from 'girder/views/App';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import promiseMiddleware from 'redux-promise-middleware';

import AppContainer from './AppContainer';
import reducers from './reducers';
import template from './templates/layout.pug';

import './stylesheets/layout.styl';

const VauiApp = App.extend({
    render() {
        this.$el.html(template());
        var store = createStore(reducers, applyMiddleware(
            thunk,
            promiseMiddleware()
        ));

        render(
            <Provider store={store}>
                <AppContainer />
            </Provider>,
            document.getElementById('g-app-body-container')
        );

        return this;
    }

});
export default VauiApp;
