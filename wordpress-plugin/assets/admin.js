/**
 * AI Blog Automation Plugin Admin JavaScript
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        
        // Copy to clipboard functionality
        $('.ai-blog-copy').on('click', function(e) {
            e.preventDefault();
            var textToCopy = $(this).data('copy');
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(function() {
                    showNotice('Copied to clipboard!', 'success');
                }).catch(function() {
                    fallbackCopy(textToCopy);
                });
            } else {
                fallbackCopy(textToCopy);
            }
        });
        
        // Fallback copy method for older browsers
        function fallbackCopy(text) {
            var $temp = $('<textarea>');
            $('body').append($temp);
            $temp.val(text).select();
            try {
                document.execCommand('copy');
                showNotice('Copied to clipboard!', 'success');
            } catch (err) {
                showNotice('Failed to copy. Please copy manually.', 'error');
            }
            $temp.remove();
        }
        
        // Show admin notice
        function showNotice(message, type) {
            var noticeClass = type === 'error' ? 'notice-error' : 'notice-success';
            var $notice = $('<div class="notice ' + noticeClass + ' is-dismissible"><p>' + message + '</p></div>');
            
            $('.wrap h1').after($notice);
            
            setTimeout(function() {
                $notice.fadeOut(function() {
                    $(this).remove();
                });
            }, 3000);
        }
        
        // AJAX form handling for settings
        $('#ai-blog-automation-settings-form').on('submit', function(e) {
            e.preventDefault();
            
            var $form = $(this);
            var $button = $form.find('button[type="submit"]');
            var originalText = $button.text();
            
            $button.prop('disabled', true).text('Saving...');
            
            $.ajax({
                url: aiBlockAutomation.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'ai_blog_automation_save_settings',
                    nonce: aiBlockAutomation.nonce,
                    settings: $form.serialize()
                },
                success: function(response) {
                    if (response.success) {
                        showNotice('Settings saved successfully!', 'success');
                    } else {
                        showNotice('Failed to save settings: ' + response.data.message, 'error');
                    }
                },
                error: function() {
                    showNotice('An error occurred while saving settings.', 'error');
                },
                complete: function() {
                    $button.prop('disabled', false).text(originalText);
                }
            });
        });
        
    });
    
})(jQuery);

