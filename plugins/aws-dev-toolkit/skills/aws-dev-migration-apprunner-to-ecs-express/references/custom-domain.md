# Custom Domain Configuration for ECS Express Mode

Custom domains are configured outside the Express Mode API - you modify the ALB and DNS directly. Express Mode won't overwrite these changes.

---

## Step 1: Verify Certificate

Present commands for the user to check if an ACM certificate exists for the custom domain and is in ISSUED status.

If no certificate exists, present commands for the user to request one with DNS validation and create the validation CNAME record. Wait for issuance before proceeding.

## Step 2: Get ALB Details

Describe the Express Mode service to get the ALB DNS name and the auto-generated service URL.

Then present commands for the user to find the ALB's HTTPS listener and its current listener rules.

## Step 3: Add Domain to Listener Rule

Present the command for the user to update the ALB listener rule's host-header condition to include both the original Express Mode URL and the custom domain.

Important: Keep the original URL in the condition - removing it breaks access via the auto-generated URL.

## Step 4: Attach Certificate

Present the command for the user to add the ACM certificate to the ALB HTTPS listener.

## Step 5: Create DNS Record

Present the command for the user to create a Route 53 record pointing the custom domain to the ALB:
- Route 53: Alias A record (preferred - no user-configurable TTL, resolved at the authoritative nameserver)
- External DNS: CNAME record pointing to the ALB DNS name

## Step 6: Verify

Test the custom domain - health check should return HTTP 200 with a valid SSL certificate.

Return to [migration-workflow.md](migration-workflow.md) Step 6 to continue validation.
