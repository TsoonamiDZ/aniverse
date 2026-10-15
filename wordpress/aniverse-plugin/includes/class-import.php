<?php
/**
 * Aniverse Import — reads the seed SQL file bundled in the plugin and executes
 * it in batches via AJAX. No phpMyAdmin needed — the user just clicks a button.
 */
if (!defined('ABSPATH')) exit;

class Aniverse_Import {

    /**
     * Get the path to the bundled seed SQL.gz file.
     */
    public static function seed_file() {
        return ANIVERSE_PATH . 'aniverse-seed.sql.gz';
    }

    /**
     * Read + decompress + split the seed SQL into individual statements.
     */
    public static function get_statements($offset = 0, $limit = 500) {
        $file = self::seed_file();
        if (!file_exists($file)) return ['error' => 'seed file not found'];

        // Decompress
        $data = file_get_contents('compress.zlib://' . $file);
        if ($data === false) return ['error' => 'cannot read seed file'];

        // Remove comment lines
        $lines = explode("\n", $data);
        $cleaned = [];
        foreach ($lines as $line) {
            $t = trim($line);
            if ($t === '' || strpos($t, '--') === 0 || strpos($t, 'SET ') === 0) continue;
            $cleaned[] = $line;
        }
        $sql = implode("\n", $cleaned);

        // Split by ; at end of line (INSERT statements end with );
        $statements = array_filter(array_map('trim', explode(";\n", $sql)));
        $total = count($statements);
        $batch = array_slice($statements, $offset, $limit);

        return [
            'statements' => $batch,
            'total' => $total,
            'offset' => $offset,
            'nextOffset' => $offset + count($batch),
            'done' => ($offset + count($batch)) >= $total,
        ];
    }

    /**
     * Execute a batch of SQL statements.
     */
    public static function execute_batch($statements) {
        global $wpdb;
        $ok = 0; $fail = 0;
        foreach ($statements as $sql) {
            $sql = trim($sql);
            if (!$sql) continue;
            $result = $wpdb->query($sql);
            if ($result === false) $fail++;
            else $ok++;
        }
        return ['ok' => $ok, 'failed' => $fail];
    }

    /**
     * Full import status (for the admin page).
     */
    public static function get_stats() {
        return Aniverse_Database::get_stats();
    }
}
