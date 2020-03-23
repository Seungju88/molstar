/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { OrderedSet } from '../../../mol-data/int';
import { BoundaryHelper } from '../../../mol-math/geometry/boundary-helper';
import { Vec3 } from '../../../mol-math/linear-algebra';
import { PrincipalAxes } from '../../../mol-math/linear-algebra/matrix/principal-axes';
import { EmptyLoci, Loci } from '../../../mol-model/loci';
import { Structure, StructureElement, StructureSelection } from '../../../mol-model/structure';
import { Boundary } from '../../../mol-model/structure/structure/util/boundary';
import { PluginContext } from '../../../mol-plugin/context';
import { StateObject, StateObjectRef } from '../../../mol-state';
import { Task } from '../../../mol-task';
import { structureElementStatsLabel } from '../../../mol-theme/label';
import { arrayRemoveAtInPlace } from '../../../mol-util/array';
import { StatefulPluginComponent } from '../../component';
import { StructureSelectionQuery } from '../../helpers/structure-selection-query';
import { PluginStateObject } from '../../objects';
import { UUID } from '../../../mol-util';

interface StructureSelectionManagerState {
    entries: Map<string, SelectionEntry>,
    additionsHistory: StructureSelectionHistoryEntry[],
    stats?: SelectionStats
}

const boundaryHelper = new BoundaryHelper('98');
const HISTORY_CAPACITY = 8;

export type StructureSelectionModifier = 'add' | 'remove' | 'intersect' | 'set'

export class StructureSelectionManager extends StatefulPluginComponent<StructureSelectionManagerState> {
    readonly events = {
        changed: this.ev<undefined>(),
        additionsHistoryUpdated: this.ev<undefined>()
    }

    private referenceLoci: Loci | undefined

    get entries() { return this.state.entries; }
    get additionsHistory() { return this.state.additionsHistory; }
    get stats() {
        if (this.state.stats) return this.state.stats;
        this.state.stats = this.calcStats();
        return this.state.stats;
    }

    private getEntry(s: Structure) {
        const cell = this.plugin.helpers.substructureParent.get(s);
        if (!cell) return;
        const ref = cell.transform.ref;
        if (!this.entries.has(ref)) {
            const entry = new SelectionEntry(StructureElement.Loci(s, []));
            this.entries.set(ref, entry);
            return entry;
        }

        return this.entries.get(ref)!;
    }

    private calcStats(): SelectionStats {
        let structureCount = 0
        let elementCount = 0
        const stats = StructureElement.Stats.create()

        this.entries.forEach(v => {
            const { elements } = v.selection
            if (elements.length) {
                structureCount += 1
                for (let i = 0, il = elements.length; i < il; ++i) {
                    elementCount += OrderedSet.size(elements[i].indices)
                }
                StructureElement.Stats.add(stats, stats, StructureElement.Stats.ofLoci(v.selection))
            }
        })

        const label = structureElementStatsLabel(stats, { countsOnly: true })

        return { structureCount, elementCount, label }
    }

    private add(loci: Loci): boolean {
        if (!StructureElement.Loci.is(loci)) return false;

        const entry = this.getEntry(loci.structure);
        if (!entry) return false;

        const sel = entry.selection;
        entry.selection = StructureElement.Loci.union(entry.selection, loci);
        this.tryAddHistory(loci);
        this.referenceLoci = loci
        return !StructureElement.Loci.areEqual(sel, entry.selection);
    }

    private remove(loci: Loci) {
        if (!StructureElement.Loci.is(loci)) return false;

        const entry = this.getEntry(loci.structure);
        if (!entry) return false;

        const sel = entry.selection;
        entry.selection = StructureElement.Loci.subtract(entry.selection, loci);
        // this.addHistory(loci);
        this.referenceLoci = loci
        return !StructureElement.Loci.areEqual(sel, entry.selection);
    }

    private intersect(loci: Loci): boolean {
        if (!StructureElement.Loci.is(loci)) return false;

        const entry = this.getEntry(loci.structure);
        if (!entry) return false;

        const sel = entry.selection;
        entry.selection = StructureElement.Loci.intersect(entry.selection, loci);
        // this.addHistory(loci);
        this.referenceLoci = loci
        return !StructureElement.Loci.areEqual(sel, entry.selection);
    }

    private set(loci: Loci) {
        if (!StructureElement.Loci.is(loci)) return false;

        const entry = this.getEntry(loci.structure);
        if (!entry) return false;

        const sel = entry.selection;
        entry.selection = loci;
        this.tryAddHistory(loci);
        this.referenceLoci = undefined;
        return !StructureElement.Loci.areEqual(sel, entry.selection);
    }

    modifyHistory(entry: StructureSelectionHistoryEntry, action: 'remove' | 'up' | 'down', modulus?: number) {
        const idx = this.additionsHistory.indexOf(entry);
        if (idx < 0) return;

        let swapWith: number | undefined = void 0;

        switch (action) {
            case 'remove': arrayRemoveAtInPlace(this.additionsHistory, idx); break;
            case 'up': swapWith = idx - 1; break;
            case 'down': swapWith = idx + 1; break;
        }

        if (swapWith !== void 0) {
            const mod = modulus ? Math.min(this.additionsHistory.length, modulus) : this.additionsHistory.length;
            swapWith = swapWith % mod;
            if (swapWith < 0) swapWith += mod;

            const t = this.additionsHistory[idx];
            this.additionsHistory[idx] = this.additionsHistory[swapWith];
            this.additionsHistory[swapWith] = t;
        }

        this.events.additionsHistoryUpdated.next();
    }

    private tryAddHistory(loci: StructureElement.Loci) {
        if (Loci.isEmpty(loci)) return;

        let idx = 0, entry: StructureSelectionHistoryEntry | undefined = void 0;
        for (const l of this.additionsHistory) {
            if (Loci.areEqual(l.loci, loci)) {
                entry = l;
                break;
            }
            idx++;
        }

        if (entry) {
            arrayRemoveAtInPlace(this.additionsHistory, idx);
            this.additionsHistory.unshift(entry);
            this.events.additionsHistoryUpdated.next();
            return;
        }

        const stats = StructureElement.Stats.ofLoci(loci);
        const label = structureElementStatsLabel(stats, { reverse: true });

        this.additionsHistory.unshift({ id: UUID.create22(), loci, label });
        if (this.additionsHistory.length > HISTORY_CAPACITY) this.additionsHistory.pop();

        this.events.additionsHistoryUpdated.next();
    }

    // private removeHistory(loci: Loci) {
    //     if (Loci.isEmpty(loci)) return;

    //     let idx = 0, found = false;
    //     for (const l of this.history) {
    //         if (Loci.areEqual(l.loci, loci)) {
    //             found = true;
    //             break;
    //         }
    //         idx++;
    //     }

    //     if (found) {
    //         arrayRemoveAtInPlace(this.history, idx);
    //     }
    // }

    private onRemove(ref: string) {
        if (this.entries.has(ref)) {
            this.entries.delete(ref);
            // TODO: property update the latest loci
            this.state.additionsHistory = [];
            this.referenceLoci = undefined
        }
    }

    private onUpdate(ref: string, oldObj: StateObject | undefined, obj: StateObject) {
        if (!PluginStateObject.Molecule.Structure.is(obj)) return;

        if (this.entries.has(ref)) {
            if (!PluginStateObject.Molecule.Structure.is(oldObj) || oldObj === obj || oldObj.data === obj.data) return;

            // TODO: property update the latest loci & reference loci
            this.state.additionsHistory = [];
            this.referenceLoci = undefined

            // remap the old selection to be related to the new object if possible.
            if (Structure.areUnitAndIndicesEqual(oldObj.data, obj.data)) {
                this.entries.set(ref, remapSelectionEntry(this.entries.get(ref)!, obj.data));
                return;
            }

            // clear the selection
            this.entries.set(ref, new SelectionEntry(StructureElement.Loci(obj.data, [])));
        }
    }

    /** Removes all selections and returns them */
    clear() {
        const keys = this.entries.keys();
        const selections: StructureElement.Loci[] = [];
        while (true) {
            const k = keys.next();
            if (k.done) break;
            const s = this.entries.get(k.value)!;
            if (!StructureElement.Loci.isEmpty(s.selection)) selections.push(s.selection);
            s.selection = StructureElement.Loci(s.selection.structure, []);
        }
        this.referenceLoci = undefined
        this.state.stats = void 0;
        this.events.changed.next()
        return selections;
    }

    getLoci(structure: Structure) {
        const entry = this.getEntry(structure);
        if (!entry) return EmptyLoci;
        return entry.selection;
    }

    getStructure(structure: Structure) {
        const entry = this.getEntry(structure);
        if (!entry) return;
        return entry.structure;
    }

    has(loci: Loci) {
        if (StructureElement.Loci.is(loci)) {
            const entry = this.getEntry(loci.structure);
            if (entry) {
                return StructureElement.Loci.isSubset(entry.selection, loci);
            }
        }
        return false;
    }

    tryGetRange(loci: Loci): StructureElement.Loci | undefined {
        if (!StructureElement.Loci.is(loci)) return;
        if (loci.elements.length !== 1) return;
        const entry = this.getEntry(loci.structure);
        if (!entry) return;

        const xs = loci.elements[0];
        if (!xs) return;

        const ref = this.referenceLoci
        if (!ref || !StructureElement.Loci.is(ref) || ref.structure.root !== loci.structure.root) return;

        let e: StructureElement.Loci['elements'][0] | undefined;
        for (const _e of ref.elements) {
            if (xs.unit === _e.unit) {
                e = _e;
                break;
            }
        }
        if (!e) return;

        if (xs.unit !== e.unit) return;

        return getElementRange(loci.structure.root, e, xs)
    }

    private prevHighlight: StructureElement.Loci | undefined = void 0;

    accumulateInteractiveHighlight(loci: Loci) {
        if (StructureElement.Loci.is(loci)) {
            if (this.prevHighlight) {
                this.prevHighlight = StructureElement.Loci.union(this.prevHighlight, loci);
            } else {
                this.prevHighlight = loci;
            }
        }
        return this.prevHighlight;
    }

    clearInteractiveHighlight() {
        const ret = this.prevHighlight;
        this.prevHighlight = void 0;
        return ret || EmptyLoci;
    }

    /** Count of all selected elements */
    elementCount() {
        let count = 0
        this.entries.forEach(v => {
            count += StructureElement.Loci.size(v.selection)
        })
        return count
    }

    getBoundary() {
        const min = Vec3.create(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
        const max = Vec3.create(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE)

        boundaryHelper.reset();

        const boundaries: Boundary[] = []
        this.entries.forEach(v => {
            const loci = v.selection
            if (!StructureElement.Loci.isEmpty(loci)) {
                boundaries.push(StructureElement.Loci.getBoundary(loci))
            }
        })

        for (let i = 0, il = boundaries.length; i < il; ++i) {
            const { box, sphere } = boundaries[i];
            Vec3.min(min, min, box.min);
            Vec3.max(max, max, box.max);
            boundaryHelper.includePositionRadius(sphere.center, sphere.radius)
        }
        boundaryHelper.finishedIncludeStep();
        for (let i = 0, il = boundaries.length; i < il; ++i) {
            const { sphere } = boundaries[i];
            boundaryHelper.radiusPositionRadius(sphere.center, sphere.radius);
        }

        return { box: { min, max }, sphere: boundaryHelper.getSphere() };
    }

    getPrincipalAxes(): PrincipalAxes {
        const elementCount = this.elementCount()
        const positions = new Float32Array(3 * elementCount)
        let offset = 0
        this.entries.forEach(v => {
            StructureElement.Loci.toPositionsArray(v.selection, positions, offset)
            offset += StructureElement.Loci.size(v.selection) * 3
        })
        return PrincipalAxes.ofPositions(positions)
    }

    modify(modifier: StructureSelectionModifier, loci: Loci) {
        let changed = false;
        switch (modifier) {
            case 'add': changed = this.add(loci); break;
            case 'remove': changed = this.remove(loci); break;
            case 'intersect': changed = this.intersect(loci); break;
            case 'set': changed = this.set(loci); break;
        }

        if (changed) {
            this.state.stats = void 0;
            this.events.changed.next();
        }
    }

    private get applicableStructures() {
        return this.plugin.managers.structure.hierarchy.selection.structures
            .filter(s => !!s.cell.obj)
            .map(s => s.cell.obj!.data);
    }

    private triggerInteraction(modifier: StructureSelectionModifier, loci: Loci, applyGranularity = true) {
        switch (modifier) {
            case 'add':
                this.plugin.managers.interactivity.lociSelects.select({ loci }, applyGranularity)
                break
            case 'remove':
                this.plugin.managers.interactivity.lociSelects.deselect({ loci }, applyGranularity)
                break
            case 'intersect':
                this.plugin.managers.interactivity.lociSelects.selectJoin({ loci }, applyGranularity)
                break
            case 'set':
                this.plugin.managers.interactivity.lociSelects.selectOnly({ loci }, applyGranularity)
                break
        }
    }

    fromLoci(modifier: StructureSelectionModifier, loci: Loci, applyGranularity = true) {
        this.triggerInteraction(modifier, loci, applyGranularity);
    }

    fromSelectionQuery(modifier: StructureSelectionModifier, query: StructureSelectionQuery, applyGranularity = true) {
        this.plugin.runTask(Task.create('Structure Selection', async runtime => {
            for (const s of this.applicableStructures) {
                const loci = await query.getSelection(this.plugin, runtime, s);
                this.triggerInteraction(modifier, StructureSelection.toLociWithSourceUnits(loci), applyGranularity);
            }
        }))
    }

    fromSelections(ref: StateObjectRef<PluginStateObject.Molecule.Structure.Selections>) {
        const cell = StateObjectRef.resolveAndCheck(this.plugin.state.data, ref);
        if (!cell || !cell.obj) return;

        if (!PluginStateObject.Molecule.Structure.Selections.is(cell.obj)) {
            console.warn('fromSelections applied to wrong object type.', cell.obj);
            return;
        }

        this.clear();
        for (const s of cell.obj?.data) {
            this.fromLoci('set', s.loci);
        }
    }

    constructor(private plugin: PluginContext) {
        super({ entries: new Map(), additionsHistory: [], stats: SelectionStats() });

        plugin.state.data.events.object.removed.subscribe(e => this.onRemove(e.ref));
        plugin.state.data.events.object.updated.subscribe(e => this.onUpdate(e.ref, e.oldObj, e.obj));
    }
}

interface SelectionStats {
    structureCount: number,
    elementCount: number,
    label: string
}

function SelectionStats(): SelectionStats { return { structureCount: 0, elementCount: 0, label: 'Nothing Selected' } };

class SelectionEntry {
    private _selection: StructureElement.Loci;
    private _structure?: Structure = void 0;

    get selection() { return this._selection; }
    set selection(value: StructureElement.Loci) {
        this._selection = value;
        this._structure = void 0
    }

    get structure(): Structure | undefined {
        if (this._structure) return this._structure;
        if (Loci.isEmpty(this._selection)) {
            this._structure = void 0;
        } else {
            this._structure = StructureElement.Loci.toStructure(this._selection);
        }
        return this._structure;
    }

    constructor(selection: StructureElement.Loci) {
        this._selection = selection;
    }
}

export interface StructureSelectionHistoryEntry {
    id: UUID,
    loci: StructureElement.Loci,
    label: string
}

/** remap `selection-entry` to be related to `structure` if possible */
function remapSelectionEntry(e: SelectionEntry, s: Structure): SelectionEntry {
    return new SelectionEntry(StructureElement.Loci.remap(e.selection, s));
}

/**
 * Assumes `ref` and `ext` belong to the same unit in the same structure
 */
function getElementRange(structure: Structure, ref: StructureElement.Loci['elements'][0], ext: StructureElement.Loci['elements'][0]) {
    const min = Math.min(OrderedSet.min(ref.indices), OrderedSet.min(ext.indices))
    const max = Math.max(OrderedSet.max(ref.indices), OrderedSet.max(ext.indices))

    return StructureElement.Loci(structure, [{
        unit: ref.unit,
        indices: OrderedSet.ofRange(min as StructureElement.UnitIndex, max as StructureElement.UnitIndex)
    }]);
}