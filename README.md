# Leo Stone Site

A lightweight static personal website for Leo Stone.

## Local Preview

Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080
```

## Deploy To The Google Cloud VM

The first deployment should be done on the VM:

```bash
sudo apt update
sudo apt install -y nginx git
sudo systemctl enable --now nginx

sudo mkdir -p /srv/leo
sudo chown -R "$USER:$USER" /srv/leo
cd /srv/leo
git clone https://github.com/leo-stone-easynet-world/leo-stone-site.git

sudo rm -rf /var/www/html
sudo ln -s /srv/leo/leo-stone-site /var/www/html
sudo nginx -t
sudo systemctl reload nginx
```

Verify:

```bash
curl -I http://localhost
curl -I http://130.211.192.153
```

## Update Workflow

Make changes locally with Codex, then:

```bash
git status
git add .
git commit -m "Update site"
git push
```

On the VM:

```bash
cd /srv/leo/leo-stone-site
git pull --ff-only
sudo nginx -t
sudo systemctl reload nginx
```
