import * as Utility from '@Shared/utility/index.js';
import { useItemManager } from './itemManager.js';
import { ItemIDs } from '../shared/ignoreItemIds.js';
import { AddOptions, Item } from '../shared/types.js';
import { ItemManagerConfig } from '../shared/config.js';

const itemManager = useItemManager();

/**
 * Check if the total weight of all items exceeds a maximum weight
 *
 * @param {Item[]} items
 * @param {number} maxWeight
 * @return {boolean}
 */
function isWeightExceeded(items: Item[], maxWeight: number = ItemManagerConfig.weight.maxWeight): boolean {
    const totalWeight = items.reduce((sum, item) => sum + item.quantity * item.weight, 0);
    return totalWeight > maxWeight;
}

/**
 * Verify if max slots and max weight are not exceeded if enabled
 *
 * @param {Item[]} items
 * @param {AddOptions} options
 * @return {boolean}
 */
function verifyStackAndWeight(items: Item[], options: AddOptions = {}): boolean {
    const maxCells = options.maxCells || ItemManagerConfig.slots.maxCells;
    const maxWeight = options.maxWeight || ItemManagerConfig.weight.maxWeight;

    const totalCellsOccupied = items.reduce((sum, item) => sum + item.width * item.height, 0);
    const totalAvailableCells = maxCells.width * maxCells.height;

    if ((ItemManagerConfig.slots.enabled && totalCellsOccupied > totalAvailableCells) || totalAvailableCells <= 0) {
        return false;
    }

    if (ItemManagerConfig.weight.enabled && isWeightExceeded(items, maxWeight)) {
        return false;
    }

    return true;
}

/**
 * Clones the array of items to break any bindings
 *
 * @param {Item[]} items
 * @return {Item[]}
 */
function cloneItems(items: Item[]): Item[] {
    return Utility.clone.arrayData(items);
}

export function useItemArrayManager() {
    let errorMessage = '';

    function getErrorMessage(): string {
        return errorMessage;
    }

    function setErrorMessage(message: string): void {
        errorMessage = message;
    }

    function handleItemStacking(
        items: Item[],
        baseItem: Item,
        quantity: number,
        options: AddOptions,
    ): Item[] | undefined {
        if (baseItem.maxStack <= 1) {
            return addNewItemStacks(items, baseItem, quantity, options);
        }

        for (let i = 0; i < items.length; i++) {
            if (items[i].id !== baseItem.id || items[i].quantity === baseItem.maxStack) {
                continue;
            }

            if (quantity <= 0) {
                break;
            }

            const availableSpace = baseItem.maxStack - items[i].quantity;
            const quantityToAdd = Math.min(availableSpace, quantity);

            items[i].quantity += quantityToAdd;
            quantity -= quantityToAdd;
        }

        return quantity > 0 ? addNewItemStacks(items, baseItem, quantity, options) : items;
    }

    function addNewItemStacks(
        items: Item[],
        baseItem: Item,
        quantity: number,
        options: AddOptions,
    ): Item[] | undefined {
        while (quantity > 0) {
            const uid = Utility.uid.generate();
            const actualQuantity = Math.min(quantity, baseItem.maxStack);
            const newItem: Item = { ...baseItem, quantity: actualQuantity, uid };

            if (options.data) {
                newItem.data = options.data;
            }

            items.push(newItem);
            quantity -= actualQuantity;
        }

        return verifyStackAndWeight(items, options) ? items : undefined;
    }

    function add(id: ItemIDs, quantity: number, items: Item[], options: AddOptions = {}): Item[] | undefined {
        errorMessage = '';
        const baseItem = itemManager.getBaseItem(id);
        if (!baseItem) {
            setErrorMessage('Base item does not exist');
            return undefined;
        }

        items = cloneItems(items);

        if (baseItem.maxStack <= 1) {
            return addNewItemStacks(items, baseItem as Item, quantity, options);
        }

        return handleItemStacking(items, baseItem as Item, quantity, options);
    }

    function addSpecificItem(item: Item, items: Item[], options: AddOptions = {}): Item[] | undefined {
        errorMessage = '';
        items = cloneItems(items);

        items.push({ ...item });
        return verifyStackAndWeight(items, options) ? items : undefined;
    }

    function getByUid(uid: string, items: Readonly<Item[]>): Readonly<Item> | undefined {
        errorMessage = '';
        const item = items.find((x) => x.uid === uid);
        if (!item) {
            setErrorMessage('Unable to get item by uid, item does not exist');
        }
        return item ? (item as Readonly<Item>) : undefined;
    }

    function getData<T = Object>(uid: string, items: Readonly<Item[]>): Readonly<T> | undefined {
        const item = getByUid(uid, items);
        return item ? (item.data as Readonly<T>) : undefined;
    }

    function remove(uid: string, quantity: number, items: Item[]): Item[] | undefined {
        errorMessage = '';
        const itemIndex = items.findIndex((item) => item.uid === uid);

        if (itemIndex === -1 || items[itemIndex].quantity < quantity) {
            return undefined;
        }

        items = cloneItems(items);

        if (quantity >= items[itemIndex].quantity) {
            items.splice(itemIndex, 1);
        } else {
            items[itemIndex].quantity -= quantity;
        }

        return items;
    }

    function removeAt(uid: string, items: Item[]): { items: Item[]; item: Item[] } | undefined {
        errorMessage = '';
        items = cloneItems(items);
        const index = items.findIndex((x) => x.uid === uid);
        if (index <= -1) {
            setErrorMessage('Could not find item to remove');
            return undefined;
        }

        const item = items.splice(index, 1);
        return { items, item };
    }

    function removeQuantityFrom(uid: string, quantity: number, items: Item[]): Item[] | undefined {
        errorMessage = '';
        items = cloneItems(items);
        const index = items.findIndex((x) => x.uid === uid);
        if (index <= -1) {
            setErrorMessage('Could not find item to remove');
            return undefined;
        }

        if (items[index].quantity < quantity) {
            setErrorMessage('Quantity provided does not match available item quantity');
            return undefined;
        }

        if (items[index].quantity === quantity) {
            items.splice(index, 1);
            return items;
        }

        items[index].quantity -= quantity;
        return items;
    }

    function has(id: ItemIDs, quantity: number, items: Item[]): boolean {
        errorMessage = '';
        const totalQuantityFound = items.reduce((sum, item) => {
            if (item.id === id) {
                sum += item.quantity;
            }
            return sum;
        }, 0);

        if (totalQuantityFound >= quantity) {
            return true;
        }

        setErrorMessage('Not enough quantity of item');
        return false;
    }

    function split(
        uid: string,
        amountToSplit: number,
        items: Item[],
        options: Omit<AddOptions, 'data'>,
    ): Item[] | undefined {
        errorMessage = '';
        items = cloneItems(items);
        const index = items.findIndex((x) => x.uid === uid);
        if (index <= -1) {
            setErrorMessage('Could not find given item in inventory during split');
            return undefined;
        }

        const baseItem = itemManager.getBaseItem(items[index].id as ItemIDs);
        if (!baseItem) {
            setErrorMessage('Base item does not exist');
            return undefined;
        }

        if (items[index].quantity < amountToSplit || items[index].quantity === amountToSplit) {
            setErrorMessage('Item cannot be split');
            return undefined;
        }

        items[index].quantity -= amountToSplit;
        const clonedItem: Item = Utility.clone.objectData(items[index]);

        const newItem = { ...clonedItem, quantity: amountToSplit, uid: Utility.uid.generate() };
        items.push(newItem);
        return verifyStackAndWeight(items, options) ? items : undefined;
    }

    function stack(uidToStackOn: string, uidToStack: string, items: Item[]): Item[] | undefined {
        errorMessage = '';
        items = cloneItems(items);
        const stackableIndex = items.findIndex((x) => x.uid === uidToStackOn);
        const stackIndex = items.findIndex((x) => x.uid === uidToStack);

        if (stackIndex <= -1 || stackableIndex <= -1) {
            setErrorMessage('Could not find both items in inventory');
            return undefined;
        }

        if (items[stackableIndex].id !== items[stackIndex].id) {
            setErrorMessage('Both items were not the same, and cannot be stacked');
            return undefined;
        }

        const baseItem = itemManager.getBaseItem(items[stackIndex].id as ItemIDs);
        if (!baseItem || baseItem.maxStack <= 1) {
            setErrorMessage('Item cannot be stacked');
            return undefined;
        }

        const diffToMax = items[stackableIndex].maxStack - items[stackableIndex].quantity;
        if (diffToMax <= 0) {
            setErrorMessage('Item is already at max stack');
            return undefined;
        }

        items[stackableIndex].quantity += diffToMax;
        if (items[stackIndex].quantity > diffToMax) {
            items[stackIndex].quantity -= diffToMax;
        } else {
            items.splice(stackIndex, 1);
        }

        return items;
    }

    function update(uid: string, data: Partial<Omit<Item, '_id'>>, items: Item[]): Item[] | undefined {
        errorMessage = '';
        items = cloneItems(items);

        const index = items.findIndex((x) => x.uid === uid);
        if (index <= -1) {
            setErrorMessage('Unable to get item by uid, item does not exist');
            return undefined;
        }

        if (typeof data.decay !== 'undefined' && data.decay <= 0) {
            items.splice(index, 1);
            return items;
        }

        items[index] = Object.assign(items[index], data);
        return items;
    }

    function invokeDecay(items: Item[]): Item[] {
        items = cloneItems(items);
        for (let i = items.length - 1; i >= 0; i--) {
            if (typeof items[i].decay === 'undefined') {
                continue;
            }

            items[i].decay -= 1;
            if (items[i].decay <= 0) {
                items.splice(i, 1);
            }
        }

        return items;
    }

    return {
        add,
        addSpecificItem,
        getByUid,
        getData,
        getErrorMessage,
        has,
        invokeDecay,
        remove,
        removeAt,
        removeQuantityFrom,
        setErrorMessage,
        split,
        stack,
        update,
    };
}
