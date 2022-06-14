/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { isEmptyObject } from 'vs/base/common/types';
import { onUnexpectedError } from 'vs/base/common/errors';

export type MementoObject = { [key: string]: any };

export class Memento {

	private static readonly applicationMementos = new Map<string, ScopedMemento>();
	private static readonly globalMementos = new Map<string, ScopedMemento>();
	private static readonly workspaceMementos = new Map<string, ScopedMemento>();

	private static readonly COMMON_PREFIX = 'memento/';

	private readonly id: string;

	constructor(id: string, private storageService: IStorageService) {
		this.id = Memento.COMMON_PREFIX + id;
	}

	getMemento(scope: StorageScope, target: StorageTarget): MementoObject {
		switch (scope) {
			case StorageScope.APPLICATION: {
				let applicationMemento = Memento.applicationMementos.get(this.id);
				if (!applicationMemento) {
					applicationMemento = new ScopedMemento(this.id, scope, target, this.storageService);
					Memento.applicationMementos.set(this.id, applicationMemento);
				}

				return applicationMemento.getMemento();
			}

			case StorageScope.GLOBAL: {
				let globalMemento = Memento.globalMementos.get(this.id);
				if (!globalMemento) {
					globalMemento = new ScopedMemento(this.id, scope, target, this.storageService);
					Memento.globalMementos.set(this.id, globalMemento);
				}

				return globalMemento.getMemento();
			}

			case StorageScope.WORKSPACE: {
				let workspaceMemento = Memento.workspaceMementos.get(this.id);
				if (!workspaceMemento) {
					workspaceMemento = new ScopedMemento(this.id, scope, target, this.storageService);
					Memento.workspaceMementos.set(this.id, workspaceMemento);
				}

				return workspaceMemento.getMemento();
			}
		}
	}

	saveMemento(): void {
		Memento.applicationMementos.get(this.id)?.save();
		Memento.globalMementos.get(this.id)?.save();
		Memento.workspaceMementos.get(this.id)?.save();
	}

	static clear(scope: StorageScope): void {
		switch (scope) {
			case StorageScope.APPLICATION:
				Memento.applicationMementos.clear();
				break;
			case StorageScope.GLOBAL:
				Memento.globalMementos.clear();
				break;
			case StorageScope.WORKSPACE:
				Memento.workspaceMementos.clear();
				break;
		}
	}
}

class ScopedMemento {

	private readonly mementoObj: MementoObject;

	constructor(private id: string, private scope: StorageScope, private target: StorageTarget, private storageService: IStorageService) {
		this.mementoObj = this.load();
	}

	getMemento(): MementoObject {
		return this.mementoObj;
	}

	private load(): MementoObject {
		const memento = this.storageService.get(this.id, this.scope);
		if (memento) {
			try {
				return JSON.parse(memento);
			} catch (error) {
				// Seeing reports from users unable to open editors
				// from memento parsing exceptions. Log the contents
				// to diagnose further
				// https://github.com/microsoft/vscode/issues/102251
				onUnexpectedError(`[memento]: failed to parse contents: ${error} (id: ${this.id}, scope: ${this.scope}, contents: ${memento})`);
			}
		}

		return {};
	}

	save(): void {
		if (!isEmptyObject(this.mementoObj)) {
			this.storageService.store(this.id, JSON.stringify(this.mementoObj), this.scope, this.target);
		} else {
			this.storageService.remove(this.id, this.scope);
		}
	}
}
