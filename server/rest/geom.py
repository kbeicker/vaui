#!/usr/bin/env python
# -*- coding: utf-8 -*-

##############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
##############################################################################
import json
from bson import ObjectId

from girder.api import access
from girder.api.describe import autoDescribeRoute, Description
from girder.constants import AccessType
from girder.api.rest import Resource, setResponseHeader, rawResponse
from girder.models.item import Item
from girder.plugins.vaui.models.geom import Geom


class GeomResource(Resource):

    def __init__(self):
        super(GeomResource, self).__init__()

        self.resourceName = 'geom'
        self.route('GET', (':itemId',), self.getGeomsOfItem)
        self.route('POST', (':itemId',), self.addGeomToItem)
        self.route('PUT', (':geomId',), self.updateGeom)
        self.route('DELETE', (':geomId',), self.deleteGeom)
        self.route('GET', ('export', ':itemId',), self.exportKPF)

    # The girder default serialization takes twice the time than this custom serializer. Since geom could be relatively big, it worth to use this custom serializer. 
    class JSONEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            return json.JSONEncoder.default(self, obj)

    @autoDescribeRoute(
        Description('')
        .modelParam('itemId', model=Item, level=AccessType.READ)
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    @rawResponse
    def getGeomsOfItem(self, item, params):
        setResponseHeader('Content-Type', 'application/json')
        cursor = Geom().findByItem(item)
        jsonString = self.JSONEncoder().encode(list(cursor))
        return jsonString

    @autoDescribeRoute(
        Description('')
        .modelParam('itemId', model=Item, level=AccessType.WRITE)
        .jsonParam('data', 'The geom content', requireObject=True, paramType='body')
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def addGeomToItem(self, item, data, params):
        data['itemId'] = item['_id']
        return Geom().save(data)

    @autoDescribeRoute(
        Description('')
        .modelParam('geomId', model=Geom)
        .jsonParam('data', 'The geom content', requireObject=True, paramType='body')
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def updateGeom(self, geom, data, params):
        data.pop('_id', None)
        data.pop('itemId', None)
        geom.update(data)
        return Geom().save(geom)

    @autoDescribeRoute(
        Description('')
        .modelParam('geomId', model=Geom)
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def deleteGeom(self, geom, params):
        Geom().remove(geom)
        return ''

    @autoDescribeRoute(
        Description('')
        .modelParam('itemId', model=Item, level=AccessType.READ)
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    @access.cookie
    @rawResponse
    def exportKPF(self, item, params):
        setResponseHeader('Content-Type', 'text/plain')
        setResponseHeader('Content-Disposition', 'attachment; filename=geom.kpf')
        return self.generateKPFContent(item)

    @staticmethod
    def generateKPFContent(item):
        # The pyyaml without c yaml is not fast, so for geom, considering the
        # size, we build the yaml by hand
        cursor = Geom().findByItem(item)
        output = []
        for geom in cursor:
            keyValues = []
            for key in geom:
                if key == 'itemId' or key == '_id':
                    continue
                if key == 'g0':
                    value = str(geom['g0'][0][0]) + ' ' + str(geom['g0'][0][1]) + \
                        ' ' + str(geom['g0'][1][0]) + ' ' + str(geom['g0'][1][1])
                else:
                    value = geom[key]
                keyValues.append('{0}: {1}'.format(key, value))
            content = '- { geom: { ' + ', '.join(keyValues) + ' } }'
            output.append(content)

        def gen():
            yield '\n'.join(output)
        return gen
