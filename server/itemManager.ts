import * as fs from 'fs';
import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';

import { ItemIDs } from '../shared/ignoreItemIds.js';
import { ItemManagerConfig } from '../shared/config.js';
import { BaseItem, DatabaseBaseItem } from '../shared/types.js';
import { useItemManagerDatabase } from './database.js';

const ItemIdsFilePath = './src/plugins/asc-item-manager/shared/ignoreItemIds.ts';
const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const managerDb = useItemManagerDatabase();

let databaseItems: { [id: string]: DatabaseBaseItem } = {};
let isReady = false;

async function init() {
    await alt.Utils.waitFor(() => managerDb.isReady(), 30000);

    let items = await db.getAll<DatabaseBaseItem>(ItemManagerConfig.collectionName);
    if (!items || items.length <= 0) {
        console.log(`No Items found in database...`);
        items = await db.getAll<DatabaseBaseItem>(ItemManagerConfig.collectionName);
    }

    const ids = [];
    for (let item of items) {
        ids.push(item.id);
        databaseItems[item.id] = item;
    }

    try {
        let fileContent = '// This file is auto-generated \r\n';
        fileContent += `export type ItemIDs = '${ids.length >= 1 ? ids.join(' | ') : ''}';`;
        fs.writeFileSync(ItemIdsFilePath, fileContent);
    } catch (err) {
        alt.logWarning(
            `If you renamed the folder 'asc-item-manager' please rename the plugin back to its original name`,
        );
    }

    alt.log(`Total Items - ${items.length}`);
    isReady = true;
}

export function useItemManager() {
    /**
     * Create an item, and add it to the database
     *
     * @param {BaseItem} item
     */
    async function create(item: BaseItem) {
        // Ensure weight is non-negative
        if (item.weight < 0) {
            item.weight = 0;
        }

        // Ensure maxStack is at least 1
        if (item.maxStack <= 0) {
            item.maxStack = 1;
        }

        // Wait until the system is ready
        await alt.Utils.waitFor(() => isReady, 60000 * 2);

        const clonedItem: BaseItem = Utility.clone.objectData(item);

        if (databaseItems[item.id]) {
            const itemId = databaseItems[item.id]._id;
            const updateData = { _id: itemId, ...clonedItem };
            await db.update(updateData, ItemManagerConfig.collectionName);
        } else {
            await db.create(clonedItem, ItemManagerConfig.collectionName);
            console.log('Item created:', item.id);
        }

        databaseItems[item.id] = clonedItem as DatabaseBaseItem;

        const ids = Object.keys(databaseItems);

        try {
            let fileContent = '// This file is auto-generated \r\n';
            fileContent += `export type ItemIDs = '${ids.length >= 1 ? ids.join(' | ') : ''}';`;
            fs.writeFileSync(ItemIdsFilePath, fileContent);
        } catch (err) {
            alt.logWarning(
                `If you renamed the folder 'asc-item-manager' please rename the plugin back to its original name`,
            );
        }
    }

    /**
     * Remove an item from the database
     *
     * @param {ItemIDs} id
     * @return
     */
    async function remove(id: ItemIDs) {
        if (!databaseItems[id]) {
            return false;
        }

        await db.deleteDocument(databaseItems[id]._id, ItemManagerConfig.collectionName);
        delete databaseItems[id];
        return true;
    }

    /**
     * Returns the full database item with the `_id`
     *
     * Returns `undefined` if the item does not exist
     *
     * @param {ItemIDs} id
     * @return {(DatabaseBaseItem | undefined)}
     */
    function getDatabaseItem(id: ItemIDs): DatabaseBaseItem | undefined {
        if (!databaseItems[id]) {
            return undefined;
        }

        return Utility.clone.objectData<DatabaseBaseItem>(databaseItems[id]);
    }

    /**
     * Returns a `BaseItem` clone, does not include `_id`
     *
     * @param {ItemIDs} id
     * @return
     */
    function getBaseItem(id: ItemIDs) {
        if (!databaseItems[id]) {
            return undefined;
        }

        const item = Utility.clone.objectData<DatabaseBaseItem>(databaseItems[id]);
        delete item._id;
        return item as BaseItem;
    }

    /**
     * Check if item `id` already exists
     *
     * @param {ItemIDs} id
     * @return
     */
    function has(id: ItemIDs) {
        return databaseItems[id] ? true : false;
    }

    return {
        create,
        getBaseItem,
        getDatabaseItem,
        has,
        remove,
    };
}

init();
