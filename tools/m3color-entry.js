// tools/build-m3color.mjs 的打包入口：只取运行时需要的部分
import { Hct } from './mcu/hct/hct.js';
import { SchemeTonalSpot } from './mcu/scheme/scheme_tonal_spot.js';
import { MaterialDynamicColors } from './mcu/dynamiccolor/material_dynamic_colors.js';
import { argbFromHex, hexFromArgb } from './mcu/utils/string_utils.js';
export { Hct, SchemeTonalSpot, MaterialDynamicColors, argbFromHex, hexFromArgb };
