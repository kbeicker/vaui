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
import yaml

from girder.api import access
from girder.api.describe import autoDescribeRoute, Description
from girder.constants import AccessType
from girder.api.rest import Resource, setResponseHeader, rawResponse
from girder.models.folder import Folder
from girder.plugins.vaui.models.types import Types


class TypesResource(Resource):

    def __init__(self):
        super(TypesResource, self).__init__()

        self.resourceName = 'types'
        self.route('GET', (':folderId',), self.getTypesOfFolder)
        self.route('POST', (':folderId',), self.addTypesToFolder)
        self.route('PUT', (':typesId',), self.updateTypes)
        self.route('DELETE', (':typesId',), self.deleteTypes)
        self.route('GET', ('export', ':folderId',), self.export)

    @autoDescribeRoute(
        Description('')
        .modelParam('folderId', model=Folder, level=AccessType.READ)
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def getTypesOfFolder(self, folder, params):
        cursor = Types().findByFolder(folder)
        return list(cursor)

    @autoDescribeRoute(
        Description('')
        .modelParam('folderId', model=Folder, level=AccessType.WRITE)
        .jsonParam('data', 'The types content', requireObject=True, paramType='body')
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def addTypesToFolder(self, folder, data, params):
        data['folderId'] = folder['_id']
        return Types().save(data)

    @autoDescribeRoute(
        Description('')
        .modelParam('typesId', model=Types)
        .jsonParam('data', 'The types content', requireObject=True, paramType='body')
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def updateTypes(self, types, data, params):
        data.pop('_id', None)
        data.pop('folderId', None)
        types.update(data)
        return Types().save(types)

    @autoDescribeRoute(
        Description('')
        .modelParam('typesId', model=Types)
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    def deleteTypes(self, types, params):
        Types().remove(types)
        return ''

    @autoDescribeRoute(
        Description('')
        .modelParam('folderId', model=Folder, level=AccessType.READ)
        .errorResponse()
        .errorResponse('Read access was denied on the item.', 403)
    )
    @access.user
    @access.cookie
    @rawResponse
    def export(self, folder, params):
        setResponseHeader('Content-Type', 'text/plain')
        setResponseHeader('Content-Disposition', 'attachment; filename=types.kpf')
        return self.generateKPFContent(folder)

    @staticmethod
    def generateKPFContent(folder):
        cursor = Types().findByFolder(folder)
        output = []
        for types in cursor:
            del types['_id']
            del types['folderId']
            types = yaml.safe_dump(types, default_flow_style=True,
                                   width=1000).rstrip()
            output.append('- {{ types: {0} }}'.format(types))

        def gen():
            yield '\n'.join(output)
        return gen
