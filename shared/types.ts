declare module '@Shared/types/character.js' {
    export interface Character {
        inventoryCells: { width: number; height: number };
    }
}

export type InventoryExtension = {
    /**
     * Items in the player's inventory
     *
     * @type {Array<Item>}
     */
    items?: Array<Item>;

    /**
     * The maximum number of inventory cells the player has.
     *
     * @type {{width: number, height: number}}
     */
    maxCells?: {
        width: number;
        height: number;
    };
};

export type Storage = {
    /**
     * Database ID for the storage interface
     *
     * @type {string}
     */
    _id: string;

    /**
     * Plain text string identifier for the storage
     *
     * @type {string}
     */
    id: string;

    /**
     * The name of the storage
     *
     * @type {string}
     *
     */
    name: string;

    /**
     * The date in which the storage was last used
     *
     * @type {number}
     */
    lastAccessed: number;

    /**
     * Does this storage ignore decaying
     *
     * @type {boolean}
     */
    noDecay?: boolean;
} & InventoryExtension;

export type BaseItem = {
    /**
     * A general purpose item identifier.
     *
     * Used for things like `food-burger`
     *
     * @type {string}
     */
    id: string;

    /**
     * The unique name of the item
     *
     * @type {string}
     */
    name: string;

    /**
     * The description of the item
     *
     * @type {string}
     */
    desc: string;

    /**
     * The width and height of the item in cells
     *
     * @type {number}
     */
    width: number;

    /**
     * The width and height of the item in cells
     *
     * @type {number}
     */
    height: number;

    /**
     * The position of the item in the inventory
     *
     * @type {{x: number, y: number}}
     */
    position?: {
        x: number;
        y: number;
    };

    /**
     * The rotation of the item in the inventory
     *
     * @type {number}
     */
    rotation: number;

    /**
     * The maximum amount of items that can exist in this stack of items
     *
     * @type {number}
     */
    maxStack: number;

    /**
     * Weight per item, this is not the total weight.
     *
     * You'll want to do `quantity * weight` to see the total weight of the stack.
     *
     * @type {number}
     */
    weight: number;

    /**
     * Icon for the item with extension
     *
     * ie. `icon-burger.png`
     *
     * @type {string}
     */
    icon: string;

    /**
     * The number of in-game hours before this item expires. If this value is never set it never expires.
     *
     * If the decay is set to zero at any point, any decayed items will be removed.
     *
     * @type {number}
     */
    decay?: number;

    /**
     * An arbitrary value that is the durability of the item. Other systems decide what to do when the item is used.
     *
     * When durability hits zero, all `use` calls will be halted and prevent usage.
     *
     * @type {number}
     */
    durability?: number;

    /**
     * The event name to call when the item is `used`.
     *
     * @type {string}
     */
    useEventName?: string;

    /**
     * Optional ruleset to further describe how the item will work
     *
     * Item manager does not manage these rules, just a placeholder to help with rules
     */
    rules?: {
        /**
         * Prevent the item from being traded
         *
         * @type {boolean}
         */
        noTrading?: boolean;

        /**
         * Disallow the item to enter any other storage compartments
         *
         * Such as vehicles, boxes, etc.
         *
         * @type {boolean}
         */
        noStorage?: boolean;

        /**
         * Destroy the item on drop
         *
         * @type {boolean}
         */
        noDropping?: boolean;
    };
};

export type Item = {
    /**
     * A unique string that is attached to the item.
     *
     * @type {string}
     */
    uid: string;

    /**
     * The number of items in the stack of items
     *
     * @type {number}
     */
    quantity: number;

    /**
     * Any custom data that belongs to the item
     *
     * @type {{ [key: string]: any }}
     */
    data?: { [key: string]: any };
} & BaseItem;

export type AddOptions = {
    /**
     * The name of the storage
     *
     * @type {string}
     *
     */
    name?: string;

    /**
     * The maximum weight an array of items can have
     *
     * @type {number}
     */
    maxWeight?: number;

    /**
     * The max cells of an array of items can have
     *
     * @type {{width: number, height: number}}
     */
    maxCells?: {
        width: number;
        height: number;
    };

    /**
     * Any unique data to be associated with the item
     *
     * Custom data cannot be added to items with a stack greater than 1
     *
     * @type {{[key: string]: string | number | Array<any>}}
     */
    data?: { [key: string]: string | number | Array<any> };
};

export type DatabaseBaseItem = {
    /**
     * The database identifier for the Base Item
     *
     * @type {string}
     */
    _id: string;
} & BaseItem;
