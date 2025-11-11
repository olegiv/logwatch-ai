import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * esbuild configuration for bundling logwatch-ai for SEA
 *
 * This bundles all JavaScript dependencies into a single file while:
 * - Keeping function names (required for SEA)
 * - Targeting Node.js 22 ESM format
 * - Externalizing WASM files (handled separately)
 */

async function build() {
  try {
    console.log('🔨 Building bundle with esbuild...\n');

    // Ensure dist directory exists
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    const startTime = Date.now();

    await esbuild.build({
      // Entry point
      entryPoints: ['src/analyzer.js'],

      // Output configuration
      bundle: true,
      outfile: 'dist/bundle.js',
      platform: 'node',
      target: 'node22',
      format: 'cjs', // CommonJS required for Node.js SEA

      // SEA requirements
      keepNames: true, // Required for Node.js SEA

      // Source maps for debugging
      sourcemap: false,

      // Minification (disabled to preserve readability and debugging)
      minify: false,

      // Inject shim for import.meta in CJS context
      banner: {
        js: `// Node.js SEA CommonJS bundle
// Polyfill for import.meta
var import_45meta_46url = typeof __filename !== 'undefined' ? 'file://' + __filename : '';
`
      },

      // Replace import.meta.url with the polyfill variable
      define: {
        'import.meta.url': 'import_45meta_46url'
      },

      // External packages that should not be bundled
      // sql.js WASM file will be handled separately
      external: [],

      // Loader configuration for special file types
      loader: {
        '.node': 'file', // Native modules (if any)
        '.wasm': 'file'  // WASM files
      },

      // Enable tree shaking
      treeShaking: true,

      // Metadata
      metafile: true,

      // Log level
      logLevel: 'info',
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Bundle created successfully in ${duration}s`);
    console.log(`📦 Output: dist/bundle.js`);

    // Copy sql.js WASM file to dist
    console.log('\n📋 Copying sql.js WASM file...');
    const wasmSource = path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
    const wasmDest = path.join(distDir, 'sql-wasm.wasm');

    if (fs.existsSync(wasmSource)) {
      fs.copyFileSync(wasmSource, wasmDest);
      console.log(`✅ WASM file copied to dist/sql-wasm.wasm`);
    } else {
      console.warn('⚠️  sql-wasm.wasm not found - run npm install first');
    }

    // Display bundle size
    const bundleStats = fs.statSync('dist/bundle.js');
    const bundleSize = (bundleStats.size / 1024 / 1024).toFixed(2);
    console.log(`\n📊 Bundle size: ${bundleSize} MB`);

    console.log('\n✨ Build complete!');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build
build();
