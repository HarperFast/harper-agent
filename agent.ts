#!/usr/bin/env node
import 'dotenv/config';
import { bootstrap } from './ink/main';
import { parseArgs } from './lifecycle/parseArgs';

parseArgs();
bootstrap();
