/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { SqlExtHostContext, SqlMainContext, ExtHostQueryEditorShape, MainThreadQueryEditorShape } from 'sql/workbench/api/node/sqlExtHost.protocol';
import * as sqlops from 'sqlops';
import * as vscode from 'vscode';
import { IExtHostContext } from 'vs/workbench/api/node/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workbench/api/electron-browser/extHostCustomers';
import { IConnectionManagementService, IConnectionCompletionOptions, ConnectionType, RunQueryOnConnectionMode } from 'sql/parts/connection/common/connectionManagement';
import { IQueryEditorService } from 'sql/parts/query/common/queryEditorService';
import { QueryEditor } from 'sql/parts/query/editor/queryEditor';
import { IWorkbenchEditorService } from 'vs/workbench/services/editor/common/editorService';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';

@extHostNamedCustomer(SqlMainContext.MainThreadQueryEditor)
export class MainThreadQueryEditor implements MainThreadQueryEditorShape {

	private _proxy: ExtHostQueryEditorShape;
	private _toDispose: IDisposable[];

	constructor(
		extHostContext: IExtHostContext,
		@IConnectionManagementService private _connectionManagementService: IConnectionManagementService,
		@IQueryEditorService private _queryEditorService: IQueryEditorService,
		@IWorkbenchEditorService private _editorService: IWorkbenchEditorService
	) {
		if (extHostContext) {
			this._proxy = extHostContext.getProxy(SqlExtHostContext.ExtHostQueryEditor);
		}
		this._toDispose = [];
	}

	public dispose(): void {
		this._toDispose = dispose(this._toDispose);
	}

	public $connect(fileUri: string, connectionId: string): Thenable<void> {
		return new Promise<void>((resolve, reject) => {
			let editor = this._editorService.getVisibleEditors().find(editor => editor.input.getResource().toString() === fileUri);
			let options: IConnectionCompletionOptions = {
				params: { connectionType: ConnectionType.editor, runQueryOnCompletion: RunQueryOnConnectionMode.none, input: editor ? editor.input as any : undefined },
				saveTheConnection: false,
				showDashboard: false,
				showConnectionDialogOnError: true,
				showFirewallRuleOnError: true,
			};
			if (connectionId) {
				let connection = this._connectionManagementService.getActiveConnections().filter(c => c.id === connectionId);
				if (connection && connection.length > 0) {
					this._connectionManagementService.connect(connection[0], fileUri, options).then(() => {
						resolve();
					}).catch(error => {
						reject(error);
					});
				} else {
					resolve();
				}
			} else {
				resolve();
			}
		});
	}

	public $runQuery(fileUri: string): void {
		let filteredEditors = this._editorService.getVisibleEditors().filter(editor => editor.input.getResource().toString() === fileUri);
		if (filteredEditors && filteredEditors.length > 0) {
			let editor = filteredEditors[0];
			if (editor instanceof QueryEditor) {
				let queryEditor: QueryEditor = editor;
				queryEditor.runCurrentQuery();
			}
		}
	}
}
