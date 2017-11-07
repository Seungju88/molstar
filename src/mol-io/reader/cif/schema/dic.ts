/**
 * Copyright (c) 2017 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { Database, Column } from 'mol-data/db'

import Schema = Column.Schema
import FP = Schema.FP

const str = Schema.str;
const float = Schema.float;

const datablock = {
    id: str,
    description: str
}

const dictionary = {
    title: str,
    datablock_id: str,
    version: str
}

const dictionary_history = {
    version: str,
    update: str,
    revision: str
}

const sub_category = {
    id: str,
    description: str
}

const category_group_list = {
    id: str,
    parent_id: str,
    description: str
}

const item_type_list = {
    code: str,
    primitive_code: str,
    construct: str,
    detail: str
}

const item_units_list = {
    code: str,
    detail: str
}

const item_units_conversion = {
    from_code: str,
    to_code: str,
    operator: str,
    factor: float(FP(6, 6, 6))
}

// TODO save frame dic schema

export const CIFDictionary_Schema = {
    datablock,
    dictionary,
    dictionary_history,
    sub_category,
    category_group_list,
    item_type_list,
    item_units_list,
    item_units_conversion
}

export type CIFDictionary_Schema = typeof CIFDictionary_Schema;
export interface CIFDictionary_Database extends Database.Tables<CIFDictionary_Schema> { }