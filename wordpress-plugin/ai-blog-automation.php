<?php
/**
 * Plugin Name: AI Blog Automation
 * Plugin URI: https://yourdomain.com
 * Description: Automate your blog posting with AI-generated content. Connect to the AI Blog Automation platform to automatically publish SEO-optimized posts.
 * Version: 1.0.0
 * Author: Your Company
 * Author URI: https://yourdomain.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ai-blog-automation
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('AI_BLOG_AUTOMATION_VERSION', '1.0.0');
define('AI_BLOG_AUTOMATION_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('AI_BLOG_AUTOMATION_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class AI_Blog_Automation {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
    }
    
    private function init_hooks() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // Enqueue admin scripts
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Add REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Add webhook endpoint for receiving posts
        add_action('init', array($this, 'add_rewrite_rules'));
        add_action('template_redirect', array($this, 'handle_webhook'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'AI Blog Automation',
            'AI Blog',
            'manage_options',
            'ai-blog-automation',
            array($this, 'render_admin_page'),
            'dashicons-edit-large',
            30
        );
        
        add_submenu_page(
            'ai-blog-automation',
            'Settings',
            'Settings',
            'manage_options',
            'ai-blog-automation-settings',
            array($this, 'render_settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('ai_blog_automation_settings', 'ai_blog_automation_api_url');
        register_setting('ai_blog_automation_settings', 'ai_blog_automation_api_key');
        register_setting('ai_blog_automation_settings', 'ai_blog_automation_auto_publish');
        register_setting('ai_blog_automation_settings', 'ai_blog_automation_default_category');
        register_setting('ai_blog_automation_settings', 'ai_blog_automation_default_author');
    }
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'ai-blog-automation') === false) {
            return;
        }
        
        wp_enqueue_style(
            'ai-blog-automation-admin',
            AI_BLOG_AUTOMATION_PLUGIN_URL . 'assets/admin.css',
            array(),
            AI_BLOG_AUTOMATION_VERSION
        );
        
        wp_enqueue_script(
            'ai-blog-automation-admin',
            AI_BLOG_AUTOMATION_PLUGIN_URL . 'assets/admin.js',
            array('jquery'),
            AI_BLOG_AUTOMATION_VERSION,
            true
        );
        
        wp_localize_script('ai-blog-automation-admin', 'aiBlockAutomation', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ai-blog-automation-nonce'),
        ));
    }
    
    public function register_rest_routes() {
        register_rest_route('ai-blog-automation/v1', '/webhook', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_webhook_rest'),
            'permission_callback' => array($this, 'verify_webhook_auth'),
        ));
        
        register_rest_route('ai-blog-automation/v1', '/test', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_connection'),
            'permission_callback' => array($this, 'verify_webhook_auth'),
        ));
    }
    
    public function verify_webhook_auth($request) {
        $api_key = get_option('ai_blog_automation_api_key');
        $auth_header = $request->get_header('authorization');
        
        if (empty($api_key)) {
            return true; // Allow if no API key is set (for initial setup)
        }
        
        if (empty($auth_header)) {
            return false;
        }
        
        $provided_key = str_replace('Bearer ', '', $auth_header);
        return $provided_key === $api_key;
    }
    
    public function test_connection($request) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Connection successful',
            'wordpress_version' => get_bloginfo('version'),
            'plugin_version' => AI_BLOG_AUTOMATION_VERSION,
        ), 200);
    }
    
    public function handle_webhook_rest($request) {
        $data = $request->get_json_params();
        
        if (empty($data['title']) || empty($data['content'])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Missing required fields: title and content',
            ), 400);
        }
        
        $auto_publish = get_option('ai_blog_automation_auto_publish', 'draft');
        $default_category = get_option('ai_blog_automation_default_category', 1);
        $default_author = get_option('ai_blog_automation_default_author', 1);
        
        // Prepare post data
        $post_data = array(
            'post_title' => sanitize_text_field($data['title']),
            'post_content' => wp_kses_post($data['content']),
            'post_status' => $auto_publish === 'publish' ? 'publish' : 'draft',
            'post_author' => $default_author,
            'post_category' => array($default_category),
        );
        
        if (!empty($data['excerpt'])) {
            $post_data['post_excerpt'] = sanitize_text_field($data['excerpt']);
        }
        
        // Insert post
        $post_id = wp_insert_post($post_data);
        
        if (is_wp_error($post_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => $post_id->get_error_message(),
            ), 500);
        }
        
        // Add SEO meta if Yoast is installed
        if (defined('WPSEO_VERSION')) {
            if (!empty($data['seo_title'])) {
                update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($data['seo_title']));
            }
            if (!empty($data['seo_description'])) {
                update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_text_field($data['seo_description']));
            }
            if (!empty($data['keywords'])) {
                update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($data['keywords']));
            }
        }
        
        // Handle featured image
        if (!empty($data['featured_image_url'])) {
            $this->set_featured_image_from_url($post_id, $data['featured_image_url'], $data['title']);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'post_id' => $post_id,
            'post_url' => get_permalink($post_id),
            'edit_url' => get_edit_post_link($post_id, 'raw'),
        ), 200);
    }
    
    private function set_featured_image_from_url($post_id, $image_url, $image_title) {
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        
        $tmp = download_url($image_url);
        
        if (is_wp_error($tmp)) {
            return false;
        }
        
        $file_array = array(
            'name' => basename($image_url),
            'tmp_name' => $tmp
        );
        
        $id = media_handle_sideload($file_array, $post_id, $image_title);
        
        if (is_wp_error($id)) {
            @unlink($file_array['tmp_name']);
            return false;
        }
        
        set_post_thumbnail($post_id, $id);
        return true;
    }
    
    public function render_admin_page() {
        include AI_BLOG_AUTOMATION_PLUGIN_DIR . 'templates/admin-page.php';
    }
    
    public function render_settings_page() {
        include AI_BLOG_AUTOMATION_PLUGIN_DIR . 'templates/settings-page.php';
    }
    
    public function add_rewrite_rules() {
        // Reserved for future webhook handling if needed
    }
    
    public function handle_webhook() {
        // Reserved for future webhook handling if needed
    }
}

// Initialize the plugin
function ai_blog_automation_init() {
    return AI_Blog_Automation::get_instance();
}

add_action('plugins_loaded', 'ai_blog_automation_init');

// Activation hook
register_activation_hook(__FILE__, 'ai_blog_automation_activate');

function ai_blog_automation_activate() {
    // Set default options
    add_option('ai_blog_automation_auto_publish', 'draft');
    add_option('ai_blog_automation_default_category', 1);
    add_option('ai_blog_automation_default_author', 1);
    
    flush_rewrite_rules();
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'ai_blog_automation_deactivate');

function ai_blog_automation_deactivate() {
    flush_rewrite_rules();
}

