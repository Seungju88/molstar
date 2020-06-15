/**
 * Copyright (c) 2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { IntraUnitBondLineVisual, IntraUnitBondLineParams } from '../visual/bond-intra-unit-line';
import { InterUnitBondLineVisual, InterUnitBondLineParams } from '../visual/bond-inter-unit-line';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { UnitsRepresentation } from '../units-representation';
import { ComplexRepresentation } from '../complex-representation';
import { StructureRepresentation, StructureRepresentationProvider, StructureRepresentationStateBuilder } from '../representation';
import { Representation, RepresentationParamsGetter, RepresentationContext } from '../../../mol-repr/representation';
import { ThemeRegistryContext } from '../../../mol-theme/theme';
import { Structure } from '../../../mol-model/structure';
import { getUnitKindsParam } from '../params';

const LineVisuals = {
    'intra-bond': (ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, IntraUnitBondLineParams>) => UnitsRepresentation('Intra-unit bond line', ctx, getParams, IntraUnitBondLineVisual),
    'inter-bond': (ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, InterUnitBondLineParams>) => ComplexRepresentation('Inter-unit bond line', ctx, getParams, InterUnitBondLineVisual),
};

export const LineParams = {
    ...IntraUnitBondLineParams,
    ...InterUnitBondLineParams,
    sizeFactor: PD.Numeric(1.0, { min: 0.01, max: 10, step: 0.01 }),
    unitKinds: getUnitKindsParam(['atomic']),
    visuals: PD.MultiSelect(['intra-bond', 'inter-bond'], PD.objectToOptions(LineVisuals))
};
export type LineParams = typeof LineParams
export function getLineParams(ctx: ThemeRegistryContext, structure: Structure) {
    return PD.clone(LineParams);
}

export type LineRepresentation = StructureRepresentation<LineParams>
export function LineRepresentation(ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, LineParams>): LineRepresentation {
    return Representation.createMulti('Line', ctx, getParams, StructureRepresentationStateBuilder, LineVisuals as unknown as Representation.Def<Structure, LineParams>);
}

export const LineRepresentationProvider = StructureRepresentationProvider({
    name: 'line',
    label: 'Line',
    description: 'Displays bonds as lines.',
    factory: LineRepresentation,
    getParams: getLineParams,
    defaultValues: PD.getDefaultValues(LineParams),
    defaultColorTheme: { name: 'element-symbol' },
    defaultSizeTheme: { name: 'uniform' },
    isApplicable: (structure: Structure) => structure.elementCount > 0
});