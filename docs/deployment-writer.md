# Production deployment writer

GitHub Actions is the canonical production deployment writer for TK LAB.

The production workflow declares `TKLABS_DEPLOY_WRITER=github-actions` in repository code so a missing optional repository variable cannot block releases. Cloudflare Git Integration must remain disabled to avoid a second deployment writer.
