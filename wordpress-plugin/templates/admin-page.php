<?php
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="card">
        <h2>Welcome to AI Blog Automation</h2>
        <p>This plugin connects your WordPress site to the AI Blog Automation platform, enabling automatic publishing of AI-generated, SEO-optimized blog posts.</p>
        
        <h3>Getting Started</h3>
        <ol>
            <li><strong>Configure Settings:</strong> Go to <a href="<?php echo admin_url('admin.php?page=ai-blog-automation-settings'); ?>">Settings</a> to set up your connection.</li>
            <li><strong>Create Application Password:</strong> Generate an Application Password in your WordPress profile for secure API access.</li>
            <li><strong>Connect Platform:</strong> Enter your WordPress URL and Application Password in the AI Blog Automation platform.</li>
            <li><strong>Start Automating:</strong> Configure your blog settings in the platform and let AI create content for you!</li>
        </ol>
        
        <h3>Features</h3>
        <ul>
            <li>✓ Automatic post publishing via REST API</li>
            <li>✓ SEO optimization with Yoast SEO integration</li>
            <li>✓ Automatic featured image handling</li>
            <li>✓ Draft or immediate publish options</li>
            <li>✓ Customizable default categories and authors</li>
            <li>✓ Secure webhook authentication</li>
        </ul>
        
        <h3>Quick Links</h3>
        <p>
            <a href="<?php echo admin_url('admin.php?page=ai-blog-automation-settings'); ?>" class="button button-primary">Configure Settings</a>
            <a href="<?php echo admin_url('edit.php'); ?>" class="button">View Posts</a>
            <a href="<?php echo admin_url('profile.php'); ?>" class="button">Manage Application Passwords</a>
        </p>
    </div>
    
    <div class="card">
        <h2>Recent AI-Generated Posts</h2>
        <?php
        $recent_posts = get_posts(array(
            'numberposts' => 5,
            'post_status' => 'any',
            'meta_query' => array(
                array(
                    'key' => '_ai_blog_automation',
                    'compare' => 'EXISTS'
                )
            )
        ));
        
        if ($recent_posts) {
            echo '<table class="wp-list-table widefat fixed striped">';
            echo '<thead><tr><th>Title</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>';
            echo '<tbody>';
            foreach ($recent_posts as $post) {
                echo '<tr>';
                echo '<td><a href="' . get_edit_post_link($post->ID) . '">' . esc_html($post->post_title) . '</a></td>';
                echo '<td>' . esc_html($post->post_status) . '</td>';
                echo '<td>' . esc_html(get_the_date('', $post)) . '</td>';
                echo '<td>';
                echo '<a href="' . get_edit_post_link($post->ID) . '" class="button button-small">Edit</a> ';
                echo '<a href="' . get_permalink($post->ID) . '" class="button button-small" target="_blank">View</a>';
                echo '</td>';
                echo '</tr>';
            }
            echo '</tbody></table>';
        } else {
            echo '<p>No AI-generated posts yet. Configure your platform to start creating content!</p>';
        }
        ?>
    </div>
    
    <div class="card">
        <h2>System Information</h2>
        <table class="form-table">
            <tr>
                <th>WordPress Version:</th>
                <td><?php echo get_bloginfo('version'); ?></td>
            </tr>
            <tr>
                <th>Plugin Version:</th>
                <td><?php echo AI_BLOG_AUTOMATION_VERSION; ?></td>
            </tr>
            <tr>
                <th>REST API Endpoint:</th>
                <td><code><?php echo rest_url('ai-blog-automation/v1/webhook'); ?></code></td>
            </tr>
            <tr>
                <th>Yoast SEO:</th>
                <td><?php echo defined('WPSEO_VERSION') ? '✓ Installed (v' . WPSEO_VERSION . ')' : '✗ Not installed'; ?></td>
            </tr>
        </table>
    </div>
</div>

