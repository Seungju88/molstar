/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { ChunkedArray } from '../chunked-array'

describe('Chunked Array', () => {
    it('creation', () => {
        const arr  = ChunkedArray.create<number>(_ => [], 2, 2);
        ChunkedArray.add2(arr, 1, 2);
        ChunkedArray.add2(arr, 3, 4);
        expect(ChunkedArray.compact(arr)).toEqual([1, 2, 3, 4]);
    });

    it('initial', () => {
        const arr  = ChunkedArray.create<number>(s => new Int32Array(s), 2, 6, new Int32Array([1, 2, 3, 4]));
        ChunkedArray.add2(arr, 4, 3);
        ChunkedArray.add2(arr, 2, 1);
        ChunkedArray.add2(arr, 5, 6);
        expect(ChunkedArray.compact(arr)).toEqual(new Int32Array([4, 3, 2, 1, 5, 6]));
    });
});