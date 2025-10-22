<?php
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <form method="post" action="options.php">
        <?php
        settings_fields('ai_blog_automation_settings');
        do_settings_sections('ai_blog_automation_settings');
        ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_api_url">Platform API URL</label>
                </th>
                <td>
                    <input type="url" 
                           id="ai_blog_automation_api_url" 
                           name="ai_blog_automation_api_url" 
                           value="<?php echo esc_attr(get_option('ai_blog_automation_api_url')); ?>" 
                           class="regular-text"
                           placeholder="https://your-platform-url.com">
                    <p class="description">The URL of your AI Blog Automation platform.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_api_key">Webhook API Key</label>
                </th>
                <td>
                    <input type="password" 
                           id="ai_blog_automation_api_key" 
                           name="ai_blog_automation_api_key" 
                           value="<?php echo esc_attr(get_option('ai_blog_automation_api_key')); ?>" 
                           class="regular-text">
                    <p class="description">API key for authenticating webhook requests from the platform.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_auto_publish">Auto Publish</label>
                </th>
                <td>
                    <select id="ai_blog_automation_auto_publish" name="ai_blog_automation_auto_publish">
                        <option value="draft" <?php selected(get_option('ai_blog_automation_auto_publish'), 'draft'); ?>>
                            Save as Draft
                        </option>
                        <option value="publish" <?php selected(get_option('ai_blog_automation_auto_publish'), 'publish'); ?>>
                            Publish Immediately
                        </option>
                    </select>
                    <p class="description">Whether to automatically publish posts or save them as drafts for review.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_default_category">Default Category</label>
                </th>
                <td>
                    <?php
                    wp_dropdown_categories(array(
                        'name' => 'ai_blog_automation_default_category',
                        'id' => 'ai_blog_automation_default_category',
                        'selected' => get_option('ai_blog_automation_default_category', 1),
                        'hide_empty' => false,
                        'hierarchical' => true,
                    ));
                    ?>
                    <p class="description">Default category for AI-generated posts.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_default_author">Default Author</label>
                </th>
                <td>
                    <?php
                    wp_dropdown_users(array(
                        'name' => 'ai_blog_automation_default_author',
                        'id' => 'ai_blog_automation_default_author',
                        'selected' => get_option('ai_blog_automation_default_author', 1),
                        'who' => 'authors',
                    ));
                    ?>
                    <p class="description">Default author for AI-generated posts.</p>
                </td>
            </tr>
        </table>
        
        <h2>Webhook Information</h2>
        <table class="form-table">
            <tr>
                <th scope="row">Webhook URL</th>
                <td>
                    <input type="text" 
                           value="<?php echo esc_url(rest_url('ai-blog-automation/v1/webhook')); ?>" 
                           class="regular-text" 
                           readonly>
                    <button type="button" class="button" onclick="navigator.clipboard.writeText(this.previousElementSibling.value)">
                        Copy
                    </button>
                    <p class="description">Use this URL in your AI Blog Automation platform configuration.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">Application Password</th>
                <td>
                    <p class="description">
                        To allow the platform to publish posts, create an Application Password:<br>
                        1. Go to <a href="<?php echo admin_url('profile.php'); ?>">Users → Profile</a><br>
                        2. Scroll to "Application Passwords"<br>
                        3. Create a new password named "AI Blog Automation"<br>
                        4. Copy the password and enter it in your platform configuration
                    </p>
                </td>
            </tr>
        </table>
        
        <?php submit_button(); ?>
    </form>
    
    <hr>
    
    <h2>Connection Test</h2>
    <p>Test the connection between WordPress and your AI Blog Automation platform.</p>
    <button type="button" class="button" id="test-connection">Test Connection</button>
    <div id="test-result" style="margin-top: 10px;"></div>
</div>

<script>
jQuery(document).ready(function($) {
    $('#test-connection').on('click', function() {
        var button = $(this);
        var resultDiv = $('#test-result');
        
        button.prop('disabled', true).text('Testing...');
        resultDiv.html('<p>Testing connection...</p>');
        
        $.ajax({
            url: '<?php echo rest_url('ai-blog-automation/v1/test'); ?>',
            method: 'GET',
            beforeSend: function(xhr) {
                var apiKey = $('#ai_blog_automation_api_key').val();
                if (apiKey) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + apiKey);
                }
            },
            success: function(response) {
                resultDiv.html('<div class="notice notice-success"><p>✓ Connection successful! WordPress version: ' + response.wordpress_version + '</p></div>');
            },
            error: function(xhr) {
                resultDiv.html('<div class="notice notice-error"><p>✗ Connection failed: ' + (xhr.responseJSON?.message || 'Unknown error') + '</p></div>');
            },
            complete: function() {
                button.prop('disabled', false).text('Test Connection');
            }
        });
    });
});
</script>

