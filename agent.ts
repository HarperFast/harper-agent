#!/usr/bin/env node
import 'dotenv/config';
import { parseArgs } from './lifecycle/parseArgs';

parseArgs();

import './ink/main';
